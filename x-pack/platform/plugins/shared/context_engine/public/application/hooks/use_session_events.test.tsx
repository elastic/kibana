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
import { useSessionEvents } from './use_session_events';

const renderUseSessionEvents = (
  core: ReturnType<typeof coreMock.createStart>,
  args: Parameters<typeof useSessionEvents>[0]
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <KibanaContextProvider services={core}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );
  return renderHook(() => useSessionEvents(args), { wrapper });
};

describe('useSessionEvents', () => {
  it('does not fetch without a session id', () => {
    const core = coreMock.createStart();

    const { result } = renderUseSessionEvents(core, { sessionId: '' });

    expect(core.http.get).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.events).toEqual([]);
  });

  it('fetches the session’s events with the scope filters', async () => {
    const core = coreMock.createStart();
    const event = {
      session_id: 's-1',
      user_id: 'u-1',
      agent_id: 'a-1',
      id: 'e-1',
      transcript: 'hi',
    };
    core.http.get.mockResolvedValue({ count: 1, results: [event] });

    const { result } = renderUseSessionEvents(core, { sessionId: 's-1', space: 'default' });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(core.http.get).toHaveBeenCalledWith(
      '/internal/context_engine/session_events/s-1',
      expect.objectContaining({ version: '1', query: { space: 'default' } })
    );
    expect(result.current.events).toEqual([event]);
    expect(result.current.count).toBe(1);
  });
});
