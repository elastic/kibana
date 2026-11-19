/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

export interface HistoryRow {
  actionId?: string;
  source: string;
}

/**
 * A history reader for one test, scoped to rows created since `since` (take it before the test
 * dispatches anything) and following `nextPage` to the end, so a source filter that leaves an
 * action out is checked against every matching row, not only the first page. Calls go through
 * `apiClient` with `headers`, so the history route runs as the same identity as the dispatch.
 */
export const historyClient =
  (apiClient: ApiClientFixture, headers: Record<string, string>, since: string) =>
  async (actionId: string, sourceFilters?: string): Promise<HistoryRow[]> => {
    const matches: HistoryRow[] = [];
    let nextPage: string | undefined;
    do {
      const params = new URLSearchParams({ pageSize: '100', startDate: since });
      if (sourceFilters) params.set('sourceFilters', sourceFilters);
      if (nextPage) params.set('nextPage', nextPage);

      const response = await apiClient.get(`api/osquery/history?${params}`, {
        headers: { ...headers, 'elastic-api-version': '2023-10-31' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const page = response.body as { data: HistoryRow[]; hasMore: boolean; nextPage?: string };
      matches.push(...page.data.filter((row) => row.actionId === actionId));
      nextPage = page.hasMore ? page.nextPage : undefined;
    } while (nextPage);

    return matches;
  };
