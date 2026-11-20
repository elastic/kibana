/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useAiIndexDreaming } from './use_ai_index_dreaming';

const lastRun = (isRunning: boolean) => ({
  started_at: '2026-11-01T00:00:00.000Z',
  status: isRunning ? 'running' : 'completed',
  workflow_id: 'wf-1',
  execution_id: 'exec-1',
  is_running: isRunning,
});

const renderHookWithCore = (isRunning: boolean) => {
  const core = coreMock.createStart();
  core.http.get.mockResolvedValue({
    dreaming: { enabled: true, facts: [{ type: 'preference' }] },
    last_run: lastRun(isRunning),
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
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns lastRun from the dreaming GET', async () => {
    const { result } = renderHookWithCore(false);

    await waitFor(() => expect(result.current.lastRun?.execution_id).toBe('exec-1'));
    expect(result.current.dreaming?.enabled).toBe(true);
  });

  it('polls every 3s while last_run is running', async () => {
    const { result, core } = renderHookWithCore(true);

    await waitFor(() => expect(result.current.lastRun?.is_running).toBe(true));
    expect(core.http.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => expect(core.http.get).toHaveBeenCalledTimes(2));
  });

  it('does not poll when last_run is not running', async () => {
    const { result, core } = renderHookWithCore(false);

    await waitFor(() => expect(result.current.lastRun?.is_running).toBe(false));

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    expect(core.http.get).toHaveBeenCalledTimes(1);
  });
});
