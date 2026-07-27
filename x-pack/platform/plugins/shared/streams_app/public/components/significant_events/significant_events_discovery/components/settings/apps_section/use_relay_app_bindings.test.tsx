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
import { useRelayAppBindings, useBindChannel, useUnbindChannel } from './use_relay_app_bindings';
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

  it('fetches the first page (no cursor) with a perPage query and exposes nextCursor', async () => {
    const response: SlackAppBindingsResponse = {
      bindings: [
        { channel: 'C123', displayName: 'general', status: 'bound_to_self' },
        { channel: 'C456', status: 'bound_to_self' },
      ],
      nextCursor: 'cursor-2',
    };
    httpGet.mockResolvedValue(response);
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppBindings(true), { wrapper });

    await flush();
    expect(httpGet).toHaveBeenCalledWith(
      '/internal/significant_events/apps/slack/bindings',
      expect.objectContaining({
        query: { perPage: 10 },
        signal: expect.any(AbortSignal),
      })
    );
    expect(result.current.bindings).toEqual([
      { channel: 'C123', displayName: 'general', status: 'bound_to_self' },
      { channel: 'C456', status: 'bound_to_self' },
    ]);
    expect(result.current.nextCursor).toBe('cursor-2');
    expect(result.current.isLoading).toBe(false);
  });

  it('includes the cursor in the query when paging past the first page', async () => {
    httpGet.mockResolvedValue({ bindings: [], nextCursor: undefined });
    const { wrapper } = createSetup();
    renderHook(() => useRelayAppBindings(true, 'cursor-1'), { wrapper });

    await flush();
    expect(httpGet).toHaveBeenCalledWith(
      '/internal/significant_events/apps/slack/bindings',
      expect.objectContaining({
        query: { perPage: 10, cursor: 'cursor-1' },
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('returns isLoading true while the request is pending', async () => {
    httpGet.mockReturnValue(new Promise(() => {}));
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppBindings(true), { wrapper });

    await flush();
    expect(result.current.isLoading).toBe(true);
  });

  it('returns empty bindings and shows an error toast on error without throwing', async () => {
    httpGet.mockRejectedValue(new Error('relay error'));
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppBindings(true), { wrapper });

    await flush();
    expect(result.current.bindings).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(addError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ title: expect.stringContaining('channels') })
    );
  });
});

describe('useBindChannel', () => {
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

  it('POSTs to the bind route and invalidates the bindings query', async () => {
    httpGet.mockResolvedValue({ bindings: [] });
    httpPost.mockResolvedValue({ status: 'bound' });
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useBindChannel(), { wrapper });

    await act(async () => {
      await result.current.bind('C123');
    });

    expect(httpPost).toHaveBeenCalledWith(
      '/internal/significant_events/apps/slack/bindings/C123/bind'
    );
  });

  it('shows an error toast when bind fails', async () => {
    httpPost.mockRejectedValue(new Error('conflict'));
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useBindChannel(), { wrapper });

    await act(async () => {
      await result.current.bind('C123').catch(() => {});
    });

    expect(addError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ title: expect.stringContaining('bind') })
    );
  });

  it('surfaces the relay reason from the response body as the toast message', async () => {
    httpPost.mockRejectedValue(
      Object.assign(new Error('Conflict'), { body: { message: 'channel already claimed' } })
    );
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useBindChannel(), { wrapper });

    await act(async () => {
      await result.current.bind('C123').catch(() => {});
    });

    expect(addError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'channel already claimed' }),
      expect.any(Object)
    );
  });
});

describe('useUnbindChannel', () => {
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

  it('POSTs to the unbind route and invalidates the bindings query', async () => {
    httpPost.mockResolvedValue({ status: 'unbound' });
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useUnbindChannel(), { wrapper });

    await act(async () => {
      await result.current.unbind('C123');
    });

    expect(httpPost).toHaveBeenCalledWith(
      '/internal/significant_events/apps/slack/bindings/C123/unbind'
    );
  });

  it('shows an error toast when unbind fails', async () => {
    httpPost.mockRejectedValue(new Error('forbidden'));
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useUnbindChannel(), { wrapper });

    await act(async () => {
      await result.current.unbind('C123').catch(() => {});
    });

    expect(addError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ title: expect.stringContaining('unbind') })
    );
  });

  it('surfaces the relay reason from the response body as the toast message', async () => {
    httpPost.mockRejectedValue(
      Object.assign(new Error('Forbidden'), { body: { message: 'owned by another deployment' } })
    );
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useUnbindChannel(), { wrapper });

    await act(async () => {
      await result.current.unbind('C123').catch(() => {});
    });

    expect(addError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'owned by another deployment' }),
      expect.any(Object)
    );
  });
});
