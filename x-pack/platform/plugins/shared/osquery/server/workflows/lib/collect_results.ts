/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

/**
 * Reads up to `maxRows` rows page by page. Stops at `rowCount`, at the route's 10k window and
 * when the shared output budget is spent. A read failure ends the loop: the caller decides
 * whether the rows read so far are enough.
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
}): Promise<ResultRow[]> => {
  const rows: ResultRow[] = [];
  if (budget.exhausted) return rows;

  const path = resultsPath(actionId, queryActionId);

  for (
    let page = 0;
    rows.length < maxRows &&
    rows.length < rowCount &&
    (page + 1) * RESULTS_PAGE_SIZE <= RESULTS_MAX_WINDOW;
    page++
  ) {
    const { body } = await contextManager.callKibanaApi<ResultsResponse>({
      method: 'GET',
      path,
      query: {
        page,
        pageSize: RESULTS_PAGE_SIZE,
        // A document still arriving during the read (after the deadline) sorts after the pages
        // already read, instead of shifting them.
        sort: 'event.ingested',
        sortOrder: 'asc',
      },
      headers: PUBLIC_API_HEADERS,
    });
    const edges = body.data?.edges ?? [];
    if (edges.length === 0) break;

    for (const edge of edges) {
      if (!edge._source || rows.length >= maxRows) continue;
      const row = buildRow(edge._source, ecsKeys);
      const size = rowBytes(row);
      if (size > budget.remainingBytes) {
        budget.exhausted = true;

        return rows;
      }

      budget.remainingBytes -= size;
      rows.push(row);
    }

    if (edges.length < RESULTS_PAGE_SIZE) break;
  }

  return rows;
};
