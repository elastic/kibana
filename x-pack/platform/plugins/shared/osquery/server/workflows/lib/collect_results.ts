/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import {
  RESULTS_MAX_READS_PER_POLL,
  RESULTS_MAX_WINDOW,
  RESULTS_PAGE_SIZE,
} from '../../../common/workflows/contract/budget';
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

/**
 * Page sizes tried after a failed read of a wide page (rows of ~400KB push 25 of them over the
 * response cap). Each divides the one before it, so `offset % pageSize === 0` holds after a step
 * down and the page index stays a whole number.
 */
const FALLBACK_PAGE_SIZES = [25, 5, 1];

const nextSmallerPageSize = (pageSize: number): number | undefined =>
  FALLBACK_PAGE_SIZES.find((size) => size < pageSize);

const PAGE_SIZES = [RESULTS_PAGE_SIZE, ...FALLBACK_PAGE_SIZES];

/**
 * Size of the page that starts at `offset`: the largest standard size that fits the rows still
 * wanted and divides `offset`, so the route's page index (`offset / size`) stays whole and the
 * last page does not read rows that are then discarded.
 */
const pageSizeAt = (offset: number, limit: number): number =>
  PAGE_SIZES.find((size) => size <= limit && offset % size === 0) ?? 1;

export interface CollectedResults {
  rows: ResultRow[];
  /** A read failed (not a 401/403): `rows` holds what was read before it. */
  readFailed: boolean;
}

const isForbidden = (error: unknown): boolean =>
  error instanceof KibanaApiCallError && (error.status === 401 || error.status === 403);

/**
 * Reads up to `maxRows` rows page by page. Stops at `rowCount`, at the route's 10k window and
 * when the shared output budget is spent. A failed read steps the page size down (a page of wide
 * rows can exceed the response cap) and retries; once it cannot shrink further, or after
 * {@link RESULTS_MAX_READS_PER_POLL} reads, the rows read so far are returned with `readFailed`, so
 * the caller decides whether they are enough. A 401/403 is thrown: the identity lost read access.
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
  // The widest page to read. The first page is no wider than what is asked for, so
  // `max_rows: 1` does not read 200 rows; a failed read lowers it.
  let ceiling = Math.min(RESULTS_PAGE_SIZE, maxRows);
  let offset = 0;
  let reads = 0;

  while (rows.length < maxRows && rows.length < rowCount) {
    // Bounds the time of one poll: after failed reads the pages shrink and the loop gets long.
    if (reads >= RESULTS_MAX_READS_PER_POLL) return { rows, readFailed: true };
    reads += 1;

    // The first page can be any size up to `maxRows`. Later pages shrink to what is still wanted,
    // so `max_rows: 201` reads 200 rows and then 1, not 200 rows twice.
    const wanted = Math.min(maxRows, rowCount) - rows.length;
    const pageSize = offset === 0 ? ceiling : pageSizeAt(offset, Math.min(ceiling, wanted));
    if (offset + pageSize > RESULTS_MAX_WINDOW) break;

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
          // Pages are offset-based and the route pins the search to the action's `preference`, so
          // every page is served by the same shard copies and the `_doc` tie-break is stable.
          sort: 'event.ingested',
          sortOrder: 'asc',
        },
        headers: PUBLIC_API_HEADERS,
      });
      edges = body.data?.edges ?? [];
    } catch (error) {
      if (isForbidden(error)) throw error;

      const smaller = nextSmallerPageSize(pageSize);
      if (smaller !== undefined) {
        ceiling = smaller;
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

    // A failed read shrank the pages. Once the offset is a whole standard page again, return to the
    // full size, so one transient error costs a few small reads and not the rest of the read.
    if (offset % RESULTS_PAGE_SIZE === 0) ceiling = Math.min(RESULTS_PAGE_SIZE, maxRows);
  }

  return { rows, readFailed: false };
};
