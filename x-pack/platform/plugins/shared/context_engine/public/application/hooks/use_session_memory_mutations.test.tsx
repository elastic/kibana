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
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import {
  useRememberSessionMemory,
  useSaveSessionEvent,
  useSearchSessionMemory,
} from './use_session_memory_mutations';

const scope = { session_id: 's-1', user_id: 'u-1', agent_id: 'a-1' };

const renderWithQueryClient = <T,>(core: CoreStart, useHook: () => T) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <KibanaContextProvider services={core}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );
  return { ...renderHook(useHook, { wrapper }), queryClient };
};

describe('useRememberSessionMemory', () => {
  it('POSTs the memory and resolves with the stored document', async () => {
    const core = coreMock.createStart();
    const stored = { ...scope, id: 'm-1', content: 'x', '@timestamp': '2026-01-01T00:00:00Z' };
    core.http.post.mockResolvedValue(stored);

    const { result } = renderWithQueryClient(core, () => useRememberSessionMemory());

    await act(async () => {
      result.current.mutate({ ...scope, content: 'x' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(core.http.post).toHaveBeenCalledWith(
      '/internal/context_engine/session_memory/_remember',
      expect.objectContaining({ version: '1', body: JSON.stringify({ ...scope, content: 'x' }) })
    );
    expect(result.current.data).toEqual(stored);
  });

  it('surfaces the server message in an error toast', async () => {
    const core = coreMock.createStart();
    const error = Object.assign(new Error('Bad Request'), {
      body: { message: 'action_request_validation_exception: [content] or [media] is required' },
    });
    core.http.post.mockRejectedValue(error);

    const { result } = renderWithQueryClient(core, () => useRememberSessionMemory());

    await act(async () => {
      result.current.mutate({ ...scope, content: 'x' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(core.notifications.toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Unable to remember session memory',
      toastMessage: 'action_request_validation_exception: [content] or [media] is required',
    });
  });
});

describe('useSearchSessionMemory', () => {
  it('POSTs the search body and resolves with the hits', async () => {
    const core = coreMock.createStart();
    const hits = { count: 1, results: [{ _score: 0.5, memory: { ...scope, id: 'm-1' } }] };
    core.http.post.mockResolvedValue(hits);

    const { result } = renderWithQueryClient(core, () => useSearchSessionMemory());

    await act(async () => {
      result.current.mutate({ query: 'dark mode', user_id: 'u-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(core.http.post).toHaveBeenCalledWith(
      '/internal/context_engine/session_memory/_search',
      expect.objectContaining({ body: JSON.stringify({ query: 'dark mode', user_id: 'u-1' }) })
    );
    expect(result.current.data).toEqual(hits);
  });
});

describe('useSaveSessionEvent', () => {
  it('POSTs the event and invalidates the session’s event list', async () => {
    const core = coreMock.createStart();
    core.http.post.mockResolvedValue({ ...scope, id: 'e-1', transcript: 'hi' });

    const { result, queryClient } = renderWithQueryClient(core, () => useSaveSessionEvent());

    await act(async () => {
      result.current.mutate({ ...scope, transcript: 'hi' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(core.http.post).toHaveBeenCalledWith(
      '/internal/context_engine/session_events/_save',
      expect.objectContaining({ body: JSON.stringify({ ...scope, transcript: 'hi' }) })
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['context_engine', 'session_events', 's-1'],
    });
  });
});
