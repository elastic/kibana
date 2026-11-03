/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchStart } from '@kbn/data-plugin/public';
import type { RunQuery } from './types';

const DEFAULT_ES_QL_LIMIT = 1000;
const MAX_ES_QL_LIMIT = 10_000;

/**
 * Whether ES itself cut the rows short: the implicit default limit when the query has no `LIMIT`,
 * or the hard maximum when its `LIMIT` asks for more. Hitting a `LIMIT` the user wrote is not truncation.
 */
export const isResultTruncated = (query: string, rowCount: number): boolean => {
  const last = [...query.matchAll(/\|\s*limit\s+(\d+)/gi)].at(-1);
  if (!last) return rowCount >= DEFAULT_ES_QL_LIMIT;
  return Number(last[1]) > MAX_ES_QL_LIMIT && rowCount >= MAX_ES_QL_LIMIT;
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
      truncated: isResultTruncated(query, table.rows.length),
    };
  };
