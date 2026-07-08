/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import {
  RELAY_APP_CONNECTION_STATUS,
  type SlackAppStatusResponse,
} from '@kbn/significant-events-plugin/common';
import {
  useRelayAppConnection,
  RELAY_APP_CONNECTION_STATUS_QUERY_KEY,
} from './use_relay_app_connection';
import { useKibana } from '../../../../../../hooks/use_kibana';

jest.mock('../../../../../../hooks/use_kibana', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 2 * 60 * 1_000;

const httpGet = jest.fn();
const httpPost = jest.fn();
const addError = jest.fn();

const statusResponse = (
  status: SlackAppStatusResponse['status'],
  overrides: Partial<SlackAppStatusResponse> = {}
): SlackAppStatusResponse => ({ available: true, status, ...overrides });

const createFakeAuthWindow = () => ({
  closed: false,
  opener: window as unknown as Window | null,
  location: { replace: jest.fn() },
  close: jest.fn(),
});

const createSetup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

// Flushes the microtask queue alongside any pending timers, so the async
// http.get/post mocks resolve without needing to run for real wall-clock time.
const flush = (ms = 0) => act(() => jest.advanceTimersByTimeAsync(ms));

describe('useRelayAppConnection', () => {
  let authWindow: ReturnType<typeof createFakeAuthWindow>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    authWindow = createFakeAuthWindow();
    jest.spyOn(window, 'open').mockImplementation(() => authWindow as unknown as Window);
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

  it('does not poll while there is no connection in progress', async () => {
    httpGet.mockResolvedValue(statusResponse(RELAY_APP_CONNECTION_STATUS.notConnected));
    const { wrapper } = createSetup();
    renderHook(() => useRelayAppConnection(), { wrapper });

    await flush();
    expect(httpGet).toHaveBeenCalledTimes(1);

    await flush(POLL_INTERVAL_MS * 3);
    expect(httpGet).toHaveBeenCalledTimes(1);
  });

  // Regression coverage: a page load (or reload) that observes an install
  // already `oauth_in_progress` — e.g. started from another tab — must poll,
  // not just fetch once and stop, since pollDeadlineRef starts at 0 without a
  // connect() call ever having run in this hook instance.
  it('polls status when an install is already in progress on mount, without calling connect', async () => {
    httpGet.mockResolvedValue(statusResponse(RELAY_APP_CONNECTION_STATUS.oauthInProgress));
    const { wrapper } = createSetup();
    renderHook(() => useRelayAppConnection(), { wrapper });

    await flush();
    expect(httpGet).toHaveBeenCalledTimes(1);

    await flush(POLL_INTERVAL_MS);
    expect(httpGet).toHaveBeenCalledTimes(2);

    await flush(POLL_INTERVAL_MS);
    expect(httpGet).toHaveBeenCalledTimes(3);
  });

  it('stops polling once the poll timeout elapses while still in progress', async () => {
    httpGet.mockResolvedValue(statusResponse(RELAY_APP_CONNECTION_STATUS.oauthInProgress));
    const { wrapper } = createSetup();
    renderHook(() => useRelayAppConnection(), { wrapper });

    await flush();
    const callsBeforeTimeout = httpGet.mock.calls.length;

    // Run past the poll timeout; it should have kept polling right up until then.
    await flush(POLL_TIMEOUT_MS);
    const callsAtTimeout = httpGet.mock.calls.length;
    expect(callsAtTimeout).toBeGreaterThan(callsBeforeTimeout);

    // No further polling once the deadline has passed.
    await flush(POLL_INTERVAL_MS * 5);
    expect(httpGet).toHaveBeenCalledTimes(callsAtTimeout);
  });

  // Regression coverage: the tab must be opened synchronously (before the
  // `await` on the connect request) so it carries the click's user-activation
  // and isn't treated as an unsolicited popup. Opening it from `onSuccess`
  // (after the network round-trip) gets silently blocked by most browsers
  // with default popup settings, leaving the card stuck "waiting" with no
  // consent tab.
  it('connect() opens a blank tab synchronously, detaches its opener, then navigates it once the authorize URL is known', async () => {
    httpGet.mockResolvedValue(statusResponse(RELAY_APP_CONNECTION_STATUS.notConnected));
    httpPost.mockResolvedValue({ authorizeUrl: 'https://slack/oauth' });
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppConnection(), { wrapper });
    await flush();

    httpGet.mockResolvedValue(statusResponse(RELAY_APP_CONNECTION_STATUS.oauthInProgress));

    const connectPromise = result.current.connect();
    // The tab is opened (and detached) before the connect request resolves.
    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(authWindow.opener).toBeNull();
    expect(authWindow.location.replace).not.toHaveBeenCalled();

    await act(async () => {
      await connectPromise;
    });

    expect(authWindow.location.replace).toHaveBeenCalledWith('https://slack/oauth');

    const callsAfterConnect = httpGet.mock.calls.length;
    await flush(POLL_INTERVAL_MS);
    expect(httpGet.mock.calls.length).toBeGreaterThan(callsAfterConnect);
  });

  it('closes the pre-opened tab when the connect request fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    httpGet.mockResolvedValue(statusResponse(RELAY_APP_CONNECTION_STATUS.notConnected));
    httpPost.mockRejectedValue(new Error('relay down'));
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppConnection(), { wrapper });
    await flush();

    await act(async () => {
      await result.current.connect().catch(() => undefined);
    });

    expect(authWindow.close).toHaveBeenCalledTimes(1);
    expect(authWindow.location.replace).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('does not throw when the browser blocks the pre-opened tab', async () => {
    jest.spyOn(window, 'open').mockReturnValue(null);
    httpGet.mockResolvedValue(statusResponse(RELAY_APP_CONNECTION_STATUS.notConnected));
    httpPost.mockResolvedValue({ authorizeUrl: 'https://slack/oauth' });
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppConnection(), { wrapper });
    await flush();

    await act(async () => {
      await expect(result.current.connect()).resolves.toBeUndefined();
    });
  });

  // Regression coverage: disconnect() resets the deadline to 0. If a later
  // in-progress state (e.g. the user immediately reconnects) reused that
  // stale/expired ref value instead of arming a fresh deadline, polling would
  // stop dead on the very next check.
  it('disconnect() resets the poll deadline so a later in-progress state gets a fresh polling window', async () => {
    httpGet.mockResolvedValue(statusResponse(RELAY_APP_CONNECTION_STATUS.oauthInProgress));
    httpPost.mockResolvedValue({ success: true });
    const { wrapper, queryClient } = createSetup();
    const { result } = renderHook(() => useRelayAppConnection(), { wrapper });

    // Let most of the poll window elapse.
    await flush();
    await flush(POLL_TIMEOUT_MS - POLL_INTERVAL_MS);

    httpGet.mockResolvedValue(statusResponse(RELAY_APP_CONNECTION_STATUS.notConnected));
    await act(async () => {
      await result.current.disconnect();
    });

    httpGet.mockResolvedValue(statusResponse(RELAY_APP_CONNECTION_STATUS.oauthInProgress));
    await act(() =>
      queryClient.invalidateQueries({ queryKey: RELAY_APP_CONNECTION_STATUS_QUERY_KEY })
    );
    const callsAfterReconnectObserved = httpGet.mock.calls.length;

    // Almost a full new poll window: this would already be expired if the
    // stale pre-disconnect deadline had leaked through.
    await flush(POLL_TIMEOUT_MS - POLL_INTERVAL_MS);
    expect(httpGet.mock.calls.length).toBeGreaterThan(callsAfterReconnectObserved);
  });

  it('surfaces a toast error when connect fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    httpGet.mockResolvedValue(statusResponse(RELAY_APP_CONNECTION_STATUS.notConnected));
    httpPost.mockRejectedValue(new Error('relay down'));
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppConnection(), { wrapper });
    await flush();

    await act(async () => {
      await result.current.connect().catch(() => undefined);
    });

    expect(addError).toHaveBeenCalledTimes(1);
    consoleErrorSpy.mockRestore();
  });

  it('surfaces a toast error when disconnect fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    httpGet.mockResolvedValue(statusResponse(RELAY_APP_CONNECTION_STATUS.connected));
    httpPost.mockRejectedValue(new Error('relay down'));
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppConnection(), { wrapper });
    await flush();

    await act(async () => {
      await result.current.disconnect().catch(() => undefined);
    });

    expect(addError).toHaveBeenCalledTimes(1);
    consoleErrorSpy.mockRestore();
  });

  it('reflects the status query response in the returned state', async () => {
    httpGet.mockResolvedValue(
      statusResponse(RELAY_APP_CONNECTION_STATUS.error, { error: 'workspace already bound' })
    );
    const { wrapper } = createSetup();
    const { result } = renderHook(() => useRelayAppConnection(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await flush();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.available).toBe(true);
    expect(result.current.status).toBe(RELAY_APP_CONNECTION_STATUS.error);
    expect(result.current.error).toBe('workspace already bound');
  });
});
