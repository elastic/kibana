/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useAiIndexDreaming } from './use_ai_index_dreaming';

const renderHookWithCore = (workflowIds: string[] = ['wf-1', 'wf-2']) => {
  const core = coreMock.createStart();
  core.http.get.mockResolvedValue({
    dreaming: { enabled: true, facts: [{ type: 'preference' }] },
    workflow_ids: workflowIds,
  });

  const queryClient = new QueryClient();
  const view = renderHook(() => useAiIndexDreaming('support', { enabled: true }), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <KibanaContextProvider services={core}>{children}</KibanaContextProvider>
      </QueryClientProvider>
    ),
  });

  return { ...view, core };
};

describe('useAiIndexDreaming', () => {
  it('returns workflowIds from the dreaming GET', async () => {
    const { result } = renderHookWithCore(['wf-main', 'wf-traces']);

    await waitFor(() => expect(result.current.workflowIds).toEqual(['wf-main', 'wf-traces']));
    expect(result.current.dreaming?.enabled).toBe(true);
  });

  it('returns an empty workflowIds list while dreaming is off', async () => {
    const core = coreMock.createStart();
    core.http.get.mockResolvedValue({
      dreaming: { enabled: false },
      workflow_ids: [],
    });
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useAiIndexDreaming('support', { enabled: true }), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <KibanaContextProvider services={core}>{children}</KibanaContextProvider>
        </QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.workflowIds).toEqual([]));
  });
});
