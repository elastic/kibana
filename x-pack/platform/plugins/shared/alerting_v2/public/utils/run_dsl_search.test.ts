/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { runDslSearch } from './run_dsl_search';

describe('runDslSearch', () => {
  it('returns rawResponse from the data plugin search', async () => {
    const rawResponse = { hits: { total: { value: 0 }, hits: [] }, aggregations: {} };
    const search = jest.fn().mockReturnValue(of({ rawResponse }));
    const data = { search: { search } } as unknown as DataPublicPluginStart;

    const result = await runDslSearch({
      data,
      params: { index: '.rule-events', size: 0 },
    });

    expect(result).toEqual(rawResponse);
    expect(search).toHaveBeenCalledWith(
      { params: { index: '.rule-events', size: 0 } },
      { abortSignal: undefined }
    );
  });

  it('forwards abortSignal to search', async () => {
    const rawResponse = { hits: { total: { value: 0 }, hits: [] } };
    const search = jest.fn().mockReturnValue(of({ rawResponse }));
    const data = { search: { search } } as unknown as DataPublicPluginStart;
    const abortController = new AbortController();

    await runDslSearch({
      data,
      params: { index: '.rule-events' },
      abortSignal: abortController.signal,
    });

    expect(search).toHaveBeenCalledWith(
      { params: { index: '.rule-events' } },
      expect.objectContaining({ abortSignal: abortController.signal })
    );
  });
});
