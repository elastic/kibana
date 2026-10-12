/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchContext } from '@kbn/presentation-publishing';
import { fetchEsqlData } from '@kbn/custom-content-renderer';
import { createRunEsqlQuery } from './run_esql_query';

jest.mock('@kbn/custom-content-renderer', () => ({ fetchEsqlData: jest.fn() }));

describe('createRunEsqlQuery', () => {
  it('passes the source query and the whole fetch context through, and maps the response', async () => {
    const search = jest.fn();
    const http = {};
    const signal = new AbortController().signal;
    const context = {
      timeRange: { from: 'now-1h', to: 'now' },
      filters: [{ meta: {} }],
      query: { language: 'kuery', query: 'a:b' },
      esqlVariables: [],
      projectRouting: '_alias:*',
      isApproximate: true,
    } as unknown as FetchContext;
    (fetchEsqlData as jest.Mock).mockResolvedValue({
      columns: [{ name: 'value', type: 'long' }],
      values: [[1]],
    });

    const data = await createRunEsqlQuery({ search, http } as never)(
      { type: 'esql', query: 'FROM logs | STATS COUNT(*)' },
      context,
      signal
    );

    expect(fetchEsqlData).toHaveBeenCalledWith(
      search,
      http,
      'FROM logs | STATS COUNT(*)',
      context.timeRange,
      signal,
      {
        isApproximate: true,
        projectRouting: '_alias:*',
        query: context.query,
        filters: context.filters,
        esqlVariables: [],
      }
    );
    expect(data).toEqual({ columns: [{ name: 'value', type: 'long' }], rows: [[1]] });
  });
});
