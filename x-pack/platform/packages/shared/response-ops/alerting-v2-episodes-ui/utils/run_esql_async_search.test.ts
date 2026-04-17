/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { ESQL_ASYNC_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { runEsqlAsyncSearch } from './run_esql_async_search';

describe('runEsqlAsyncSearch', () => {
  it('returns rawResponse from the data plugin search', async () => {
    const rawResponse: ESQLSearchResponse = {
      columns: [{ name: 'count', type: 'long' }],
      values: [[42]],
    };
    const search = jest.fn().mockReturnValue(of({ rawResponse }));
    const data = { search: { search } } as unknown as DataPublicPluginStart;

    const result = await runEsqlAsyncSearch({
      data,
      params: { query: 'FROM foo' },
    });

    expect(result).toEqual(rawResponse);
    expect(data.search.search).toHaveBeenCalledWith(
      { params: { query: 'FROM foo' } },
      {
        abortSignal: undefined,
        strategy: ESQL_ASYNC_SEARCH_STRATEGY,
      }
    );
  });

  it('forwards abortSignal to search', async () => {
    const rawResponse: ESQLSearchResponse = { columns: [], values: [] };
    const search = jest.fn().mockReturnValue(of({ rawResponse }));
    const data = { search: { search } } as unknown as DataPublicPluginStart;
    const abortController = new AbortController();

    await runEsqlAsyncSearch({
      data,
      params: { query: 'FROM bar' },
      abortSignal: abortController.signal,
    });

    expect(data.search.search).toHaveBeenCalledWith(
      { params: { query: 'FROM bar' } },
      expect.objectContaining({ abortSignal: abortController.signal })
    );
  });
});
