/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { RESULTS_MAX_WINDOW, RESULTS_PAGE_SIZE } from '../../../common/workflows/contract/budget';
import { buildRow } from './build_rows';
import type { ResultRow } from './build_rows';
import { PUBLIC_API_HEADERS } from './api_headers';
import type { KibanaApiCaller } from './types';

/** Bytes still available to the step output; shared by all queries of one run. */
export interface OutputBudget {
  remainingBytes: number;
  /** Set once a row did not fit: later reads return nothing and the output is `truncated`. */
  exhausted: boolean;
}

interface ResultsResponse {
  data?: { edges?: Array<{ _source?: Record<string, unknown> }>; total?: number };
}

const rowBytes = (row: ResultRow): number => Buffer.byteLength(JSON.stringify(row), 'utf8');

const resultsPath = (actionId: string, queryActionId: string) =>
  `/api/osquery/live_queries/${encodeURIComponent(actionId)}/results/${encodeURIComponent(
    queryActionId
  )}`;

/**
 * How many result documents are searchable now, from a one-row read. Polls call this until it
 * reaches the response counters, so the rows themselves are read once, after indexing caught up.
 */
export const countIndexedResults = async ({
  contextManager,
  actionId,
  queryActionId,
}: {
  contextManager: KibanaApiCaller;
  actionId: string;
  queryActionId: string;
}): Promise<number> => {
  const { body } = await contextManager.callKibanaApi<ResultsResponse>({
    method: 'GET',
    path: resultsPath(actionId, queryActionId),
    query: { page: 0, pageSize: 1 },
    headers: PUBLIC_API_HEADERS,
  });

  return body.data?.total ?? 0;
};

/** Smallest page tried after a failed read of a wide page. */
const MIN_PAGE_SIZE = 25;

export interface CollectedResults {
  rows: ResultRow[];
  /** A read failed (not a 401/403): `rows` holds what was read before it. */
  readFailed: boolean;
}

const isForbidden = (error: unknown): boolean =>
  error instanceof KibanaApiCallError && (error.status === 401 || error.status === 403);

/**
 * Reads up to `maxRows` rows page by page. Stops at `rowCount`, at the route's 10k window and
 * when the shared output budget is spent. A failed read halves the page size (a page of wide rows
 * can exceed the response cap) and retries; once it cannot shrink further the rows read so far
 * are returned with `readFailed`, so the caller decides whether they are enough. A 401/403 is
 * thrown: the identity lost read access.
 */
export const collectResults = async ({
  contextManager,
  actionId,
  queryActionId,
  ecsKeys,
  rowCount,
  maxRows,
  budget,
}: {
  contextManager: KibanaApiCaller;
  actionId: string;
  queryActionId: string;
  ecsKeys: string[];
  rowCount: number;
  maxRows: number;
  budget: OutputBudget;
}): Promise<CollectedResults> => {
  const rows: ResultRow[] = [];
  if (budget.exhausted) return { rows, readFailed: false };

  const path = resultsPath(actionId, queryActionId);
  let pageSize = RESULTS_PAGE_SIZE;
  // Always a multiple of `pageSize`: it only grows by whole pages, and the size only halves.
  let offset = 0;

  while (
    rows.length < maxRows &&
    rows.length < rowCount &&
    offset + pageSize <= RESULTS_MAX_WINDOW
  ) {
    let edges: NonNullable<ResultsResponse['data']>['edges'];
    try {
      const { body } = await contextManager.callKibanaApi<ResultsResponse>({
        method: 'GET',
        path,
        query: {
          page: offset / pageSize,
          pageSize,
          // A document still arriving during the read (after the deadline) sorts after the pages
          // already read, instead of shifting them. The route breaks ties on `_doc`.
          // Known limit: pages are offset-based, so rows sharing an `event.ingested` value can be
          // repeated or skipped if the pages are served by replicas with a different `_doc` order.
          // A PIT with `search_after` would remove it, but the results route does not offer one.
          sort: 'event.ingested',
          sortOrder: 'asc',
        },
        headers: PUBLIC_API_HEADERS,
      });
      edges = body.data?.edges ?? [];
    } catch (error) {
      if (isForbidden(error)) throw error;

      if (pageSize > MIN_PAGE_SIZE) {
        pageSize = Math.max(MIN_PAGE_SIZE, Math.floor(pageSize / 2));
        continue;
      }

      return { rows, readFailed: true };
    }

    if (edges.length === 0) return { rows, readFailed: false };

    for (const edge of edges) {
      if (!edge._source || rows.length >= maxRows) continue;
      const row = buildRow(edge._source, ecsKeys);
      const size = rowBytes(row);
      if (size > budget.remainingBytes) {
        budget.exhausted = true;

        return { rows, readFailed: false };
      }

      budget.remainingBytes -= size;
      rows.push(row);
    }

    if (edges.length < pageSize) return { rows, readFailed: false };
    offset += pageSize;
  }

  return { rows, readFailed: false };
};
