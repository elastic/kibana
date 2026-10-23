/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { usePrefetchKi } from './use_prefetch_ki';

const renderUsePrefetchKi = (core: CoreStart, aiIndexId: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      KibanaContextProvider,
      { services: core },
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

  const hook = renderHook(() => usePrefetchKi(aiIndexId), { wrapper });

  return { ...hook, queryClient, prefetchSpy };
};

describe('usePrefetchKi', () => {
  it('prefetches KI detail with the same query key shape as useKi', () => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock).mockResolvedValue({
      id: 'ki-1',
      document: { title: 'Example' },
    });
    const { result, prefetchSpy } = renderUsePrefetchKi(core, 'sample-ki');

    result.current({ id: 'ki-1', index: 'ai-index-idx-sample-ki' });

    expect(prefetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          'context_engine',
          'ai_index',
          'sample-ki',
          'ki',
          'ai-index-idx-sample-ki',
          'ki-1',
          'active,deleted',
        ],
      })
    );
  });

  it('does not prefetch when detail is already cached', () => {
    const core = coreMock.createStart();
    const { result, prefetchSpy, queryClient } = renderUsePrefetchKi(core, 'sample-ki');

    queryClient.setQueryData(
      [
        'context_engine',
        'ai_index',
        'sample-ki',
        'ki',
        'ai-index-idx-sample-ki',
        'ki-1',
        'active,deleted',
      ],
      { id: 'ki-1', document: { title: 'Cached' } }
    );

    result.current({ id: 'ki-1', index: 'ai-index-idx-sample-ki' });

    expect(prefetchSpy).not.toHaveBeenCalled();
  });

  it('does not prefetch twice while the first request is in flight', () => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock).mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        })
    );
    const { result, prefetchSpy } = renderUsePrefetchKi(core, 'sample-ki');

    result.current({ id: 'ki-1', index: 'ai-index-idx-sample-ki' });
    result.current({ id: 'ki-1', index: 'ai-index-idx-sample-ki' });

    expect(prefetchSpy).toHaveBeenCalledTimes(1);
  });

  it('does not prefetch when index is empty', () => {
    const core = coreMock.createStart();
    const { result, prefetchSpy } = renderUsePrefetchKi(core, 'sample-ki');

    result.current({ id: 'ki-1', index: '' });

    expect(prefetchSpy).not.toHaveBeenCalled();
  });
});
