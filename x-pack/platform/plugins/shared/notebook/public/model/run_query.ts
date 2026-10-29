/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchStart } from '@kbn/data-plugin/public';
import type { RunQuery } from './types';

const DEFAULT_ES_QL_LIMIT = 1000;

/** The row cap ES applies to a query: its last `LIMIT`, else the ES|QL default. */
export const getResultLimit = (query: string): number => {
  const limits = [...query.matchAll(/\|\s*limit\s+(\d+)/gi)];
  const last = limits.at(-1);
  return last ? Number(last[1]) : DEFAULT_ES_QL_LIMIT;
};

export const createRunQuery =
  (search: Pick<ISearchStart, 'esql'>): RunQuery =>
  async ({ query, params, signal }) => {
    const startedAt = performance.now();
    const namedParams = Object.entries(params).map(([name, value]) => ({ [name]: value }));
    const { datatable } = await search.esql(
      {
        query,
        // ES accepts null named params, which ESQLSearchParams does not type.
        params: namedParams as unknown as Parameters<ISearchStart['esql']>[0]['params'],
      },
      { abortSignal: signal, includeDataTable: true }
    );
    const table = datatable ?? { type: 'datatable' as const, columns: [], rows: [] };
    return {
      table,
      durationMs: Math.round(performance.now() - startedAt),
      truncated: table.rows.length >= getResultLimit(query),
    };
  };
