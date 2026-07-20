/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { SlackAppBindingsResponse } from '@kbn/significant-events-plugin/common';
import { useRelayAppBindings } from './use_relay_app_bindings';
import { useKibana } from '../../../../../../hooks/use_kibana';

jest.mock('../../../../../../hooks/use_kibana', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const httpGet = jest.fn();
const httpPost = jest.fn();
const addError = jest.fn();

const createSetup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

const flush = (ms = 0) => act(() => jest.advanceTimersByTimeAsync(ms));

describe('useRelayAppBindings', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      core: {
        http: { get: httpGet, post: httpPost },
        notifications: { toasts: { addError } },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not fetch when enabled is false', async () => {
    httpGet.mockResolvedValue({ bindings: [] });
    const { wrapper } = createSetup();
    renderHook(() => useRelayAppBindings(false), { wrapper });

    await flush();
    expect(httpGet).not.toHaveBeenCalled();
  });

  it('fetches the bindings route when enabled is true', async () => {
    const response: SlackAppBindingsResponse = {
      bindings: [
        { isDefault: true, status: 'bound_to_self' },
        { channel: 'C123', displayName: 'general', status: 'bound_to_self' },
      ],
    };
    httpGet.mockResolvedValue(response);
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppBindings(true), { wrapper });

    await flush();
    expect(httpGet).toHaveBeenCalledWith(
      '/internal/significant_events/apps/slack/bindings',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.current.bindings).toEqual([
      { isDefault: true, status: 'bound_to_self' },
      { channel: 'C123', displayName: 'general', status: 'bound_to_self' },
    ]);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns isLoading true while the request is pending', async () => {
    // Never resolves so the query stays loading.
    httpGet.mockReturnValue(new Promise(() => {}));
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppBindings(true), { wrapper });

    await flush();
    expect(result.current.isLoading).toBe(true);
  });

  it('returns empty bindings on error without throwing', async () => {
    httpGet.mockRejectedValue(new Error('relay error'));
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppBindings(true), { wrapper });

    await flush();
    expect(result.current.bindings).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('bindChannel POSTs to the bind route and invalidates the bindings query', async () => {
    httpGet.mockResolvedValue({ bindings: [] });
    httpPost.mockResolvedValue({ status: 'bound' });
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppBindings(true), { wrapper });

    await flush();

    await act(async () => {
      await result.current.bindChannel('C123');
    });

    expect(httpPost).toHaveBeenCalledWith(
      '/internal/significant_events/apps/slack/bindings/C123/bind'
    );
    // Bindings query re-fetched after bind.
    expect(httpGet).toHaveBeenCalledTimes(2);
  });

  it('unbindChannel POSTs to the unbind route and invalidates the bindings query', async () => {
    httpGet.mockResolvedValue({ bindings: [] });
    httpPost.mockResolvedValue({ status: 'unbound' });
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppBindings(true), { wrapper });

    await flush();

    await act(async () => {
      await result.current.unbindChannel('C123');
    });

    expect(httpPost).toHaveBeenCalledWith(
      '/internal/significant_events/apps/slack/bindings/C123/unbind'
    );
    expect(httpGet).toHaveBeenCalledTimes(2);
  });

  it('shows an error toast when bindChannel fails', async () => {
    httpGet.mockResolvedValue({ bindings: [] });
    httpPost.mockRejectedValue(new Error('conflict'));
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppBindings(true), { wrapper });

    await flush();

    await act(async () => {
      // mutateAsync throws on error; swallow it here since we're asserting the toast
      await result.current.bindChannel('C123').catch(() => {});
    });

    expect(addError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ title: expect.stringContaining('bind') })
    );
  });

  it('shows an error toast when unbindChannel fails', async () => {
    httpGet.mockResolvedValue({ bindings: [] });
    httpPost.mockRejectedValue(new Error('forbidden'));
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppBindings(true), { wrapper });

    await flush();

    await act(async () => {
      await result.current.unbindChannel('C123').catch(() => {});
    });

    expect(addError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ title: expect.stringContaining('unbind') })
    );
  });
});
