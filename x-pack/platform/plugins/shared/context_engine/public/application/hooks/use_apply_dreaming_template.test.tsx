/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { contextEngineQueryKeys } from './query_keys';
import { useApplyDreamingTemplate } from './use_apply_dreaming_template';

describe('useApplyDreamingTemplate', () => {
  const config = { facts: [{ type: 'preference' }] };

  it('turns dreaming on, caches the saved config and refetches the AI index', async () => {
    const core = coreMock.createStart();
    core.http.put.mockResolvedValue({ dreaming: { enabled: true, ...config } });
    const queryClient = new QueryClient();
    jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useApplyDreamingTemplate(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <KibanaContextProvider services={core}>{children}</KibanaContextProvider>
        </QueryClientProvider>
      ),
    });

    await act(async () => {
      await result.current.applyTemplate({ aiIndexId: 'support', config });
    });

    const [, { body }] = core.http.put.mock.calls[0] as unknown as [string, { body: string }];
    expect(JSON.parse(body)).toEqual({
      enabled: true,
      ...config,
    });
    expect(queryClient.getQueryData(contextEngineQueryKeys.aiIndex.dreaming('support'))).toEqual({
      dreaming: { enabled: true, ...config },
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: contextEngineQueryKeys.aiIndex.detail('support'),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: contextEngineQueryKeys.aiIndex.list(),
    });
  });
});
