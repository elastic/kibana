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
import { useSaveDreamingConfig } from './use_save_dreaming_config';

describe('useSaveDreamingConfig', () => {
  const dreaming = { enabled: true, facts: [{ type: 'preference' }] };

  it('caches the saved config and refetches the AI index, whose automations it changes', async () => {
    const core = coreMock.createStart();
    core.http.put.mockResolvedValue({ dreaming });
    const queryClient = new QueryClient();
    jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveDreamingConfig(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <KibanaContextProvider services={core}>{children}</KibanaContextProvider>
        </QueryClientProvider>
      ),
    });

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.saveConfig({ aiIndexId: 'support', config: dreaming });
    });

    expect(saved).toBe(true);
    expect(queryClient.getQueryData(contextEngineQueryKeys.aiIndex.dreaming('support'))).toEqual({
      dreaming,
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: contextEngineQueryKeys.aiIndex.detail('support'),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: contextEngineQueryKeys.aiIndex.list(),
    });
  });
});
