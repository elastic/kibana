/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@kbn/kibana-react-plugin/public');

const mockUseMutation = vi.fn();
vi.mock('@kbn/react-query', () => {
      const mocked = {
      useMutation: (...args: unknown[]) => mockUseMutation(...args),
    };
      return { ...mocked, default: mocked };
    });

import { renderHook, act } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useConnectorOAuthConnect, OAuthRedirectMode } from './use_connector_oauth_connect';
import { OAuthAuthorizationStatus } from '@kbn/actions-plugin/common';
import { OAUTH_BROADCAST_CHANNEL_NAME } from '../oauth';

const mockHttpPost = vi.fn();
(useKibana as Mock).mockReturnValue({ services: { http: { post: mockHttpPost } } });

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  close = vi.fn();

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  postMessage = vi.fn();
}

describe('useConnectorOAuthConnect', () => {
  const originalBroadcastChannel = globalThis.BroadcastChannel;
  const originalWindowOpen = window.open;
  const originalLocationAssign = window.location.assign;

  let mockMutate: Mock;
  let capturedMutationOptions: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    MockBroadcastChannel.instances = [];
    globalThis.BroadcastChannel = MockBroadcastChannel as never;
    window.open = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: vi.fn(), href: 'http://localhost/app/connectors' },
      writable: true,
    });

    mockMutate = vi.fn();
    mockUseMutation.mockImplementation((options: Record<string, unknown>) => {
      capturedMutationOptions = options;
      return { mutate: mockMutate, isLoading: false };
    });

    mockHttpPost.mockResolvedValue({
      authorizationUrl: 'https://oauth.provider/authorize?code=abc',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.BroadcastChannel = originalBroadcastChannel;
    window.open = originalWindowOpen;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: originalLocationAssign },
      writable: true,
    });
  });

  it('returns initial state', () => {
    const { result } = renderHook(() =>
      useConnectorOAuthConnect({
        connectorId: 'conn-1',
        redirectMode: OAuthRedirectMode.NewTab,
      })
    );

    expect(result.current.isConnecting).toBe(false);
    expect(result.current.isAwaitingCallback).toBe(false);
    expect(typeof result.current.connect).toBe('function');
  });

  it('calls mutate with auto_close=true in the returnUrl for NewTab mode', () => {
    const { result } = renderHook(() =>
      useConnectorOAuthConnect({
        connectorId: 'conn-1',
        redirectMode: OAuthRedirectMode.NewTab,
        returnUrl: 'http://localhost/app/connectors',
      })
    );

    act(() => result.current.connect());

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const { returnUrl } = mockMutate.mock.calls[0][0];
    const url = new URL(returnUrl);
    expect(url.searchParams.get('auto_close')).toBe('true');
  });

  it('does not set auto_close in Redirect mode', () => {
    const { result } = renderHook(() =>
      useConnectorOAuthConnect({
        connectorId: 'conn-1',
        redirectMode: OAuthRedirectMode.Redirect,
        returnUrl: 'http://localhost/app/connectors',
      })
    );

    act(() => result.current.connect());

    const { returnUrl } = mockMutate.mock.calls[0][0];
    const url = new URL(returnUrl);
    expect(url.searchParams.has('auto_close')).toBe(false);
  });

  it('sends returnUrl as undefined when not provided', () => {
    const { result } = renderHook(() =>
      useConnectorOAuthConnect({
        connectorId: 'conn-1',
        redirectMode: OAuthRedirectMode.NewTab,
      })
    );

    act(() => result.current.connect());

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const { returnUrl } = mockMutate.mock.calls[0][0];
    expect(returnUrl).toBeUndefined();
  });

  it('encodes the connectorId in the mutation URL', () => {
    renderHook(() =>
      useConnectorOAuthConnect({
        connectorId: 'id/with special&chars',
        redirectMode: OAuthRedirectMode.Redirect,
      })
    );

    const mutationFn = capturedMutationOptions.mutationFn as (args: {
      returnUrl: string;
    }) => Promise<unknown>;
    mutationFn({ returnUrl: 'http://localhost/app' });

    expect(mockHttpPost).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('id/with special&chars')),
      expect.anything()
    );
  });

  it('uses custom returnUrl when provided', () => {
    const { result } = renderHook(() =>
      useConnectorOAuthConnect({
        connectorId: 'conn-1',
        redirectMode: OAuthRedirectMode.Redirect,
        returnUrl: 'https://custom.url/callback',
      })
    );

    act(() => result.current.connect());

    const { returnUrl } = mockMutate.mock.calls[0][0];
    expect(returnUrl).toBe('https://custom.url/callback');
  });

  describe('NewTab mode - onSuccess callback', () => {
    it('opens a new tab and sets isAwaitingCallback on mutation success', () => {
      const { result } = renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
          onSuccess: vi.fn(),
        })
      );

      const onMutationSuccess = capturedMutationOptions.onSuccess as (data: {
        authorizationUrl: string;
        state: string;
      }) => void;

      act(() => {
        onMutationSuccess({ authorizationUrl: 'https://oauth.provider/auth', state: 'abc-state' });
      });

      expect(window.open).toHaveBeenCalledWith('https://oauth.provider/auth', '_blank', 'noopener');
      expect(result.current.isAwaitingCallback).toBe(true);
    });
  });

  describe('cancelConnect', () => {
    const triggerMutationSuccess = (state = 'pending-state') => {
      const onMutationSuccess = capturedMutationOptions.onSuccess as (data: {
        authorizationUrl: string;
        state: string;
      }) => void;
      act(() => {
        onMutationSuccess({ authorizationUrl: 'https://oauth.provider/auth', state });
      });
    };

    it('resets isAwaitingCallback synchronously', () => {
      const { result } = renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
        })
      );

      triggerMutationSuccess();
      expect(result.current.isAwaitingCallback).toBe(true);

      act(() => result.current.cancelConnect());

      expect(result.current.isAwaitingCallback).toBe(false);
    });

    it('posts to the cancel endpoint when a pending state exists', () => {
      mockHttpPost.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
        })
      );

      triggerMutationSuccess('my-oauth-state');
      act(() => result.current.cancelConnect());

      expect(mockHttpPost).toHaveBeenCalledWith(
        '/internal/actions/connector/conn-1/_oauth_cancel',
        { body: JSON.stringify({ state: 'my-oauth-state' }) }
      );
    });

    it('does not post to the cancel endpoint when no state has been captured', () => {
      mockHttpPost.mockClear();

      const { result } = renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
        })
      );

      // Cancel before any flow has started
      act(() => result.current.cancelConnect());

      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    it('encodes connectorId in the cancel URL', () => {
      mockHttpPost.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'id/with special&chars',
          redirectMode: OAuthRedirectMode.NewTab,
        })
      );

      triggerMutationSuccess('some-state');
      act(() => result.current.cancelConnect());

      expect(mockHttpPost).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('id/with special&chars')),
        expect.anything()
      );
    });

    it('clears the pending state so a second cancel does not re-post', () => {
      mockHttpPost.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
        })
      );

      triggerMutationSuccess('my-oauth-state');
      act(() => result.current.cancelConnect());
      mockHttpPost.mockClear();

      act(() => result.current.cancelConnect());

      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    it('clears the pending state after a successful broadcast', () => {
      mockHttpPost.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
          onSuccess: vi.fn(),
        })
      );

      triggerMutationSuccess('my-state');

      const channel = MockBroadcastChannel.instances.find(
        (c) => c.name === OAUTH_BROADCAST_CHANNEL_NAME
      )!;
      act(() => {
        channel.onmessage!({
          data: { connectorId: 'conn-1', status: OAuthAuthorizationStatus.Success },
        } as MessageEvent);
      });

      mockHttpPost.mockClear();
      act(() => result.current.cancelConnect());

      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    it('clears the pending state after the timeout fires', () => {
      mockHttpPost.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
          timeout: 5000,
          onError: vi.fn(),
        })
      );

      triggerMutationSuccess('my-state');
      act(() => vi.advanceTimersByTime(5000));
      mockHttpPost.mockClear();

      act(() => result.current.cancelConnect());

      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    it('clears the pending state when connect is called for a new flow', () => {
      mockHttpPost.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
        })
      );

      triggerMutationSuccess('old-state');

      // Start a new flow
      act(() => result.current.connect());
      mockHttpPost.mockClear();

      act(() => result.current.cancelConnect());

      expect(mockHttpPost).not.toHaveBeenCalled();
    });
  });

  describe('NewTab mode - BroadcastChannel', () => {
    it('invokes onSuccess when receiving a success message for the matching connectorId', () => {
      const onSuccess = vi.fn();
      renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
          onSuccess,
        })
      );

      const onMutationSuccess = capturedMutationOptions.onSuccess as (data: {
        authorizationUrl: string;
        state: string;
      }) => void;
      act(() =>
        onMutationSuccess({ authorizationUrl: 'https://oauth.provider/auth', state: 'test-state' })
      );

      const channel = MockBroadcastChannel.instances.find(
        (c) => c.name === OAUTH_BROADCAST_CHANNEL_NAME
      )!;

      act(() => {
        channel.onmessage!({
          data: { connectorId: 'conn-1', status: OAuthAuthorizationStatus.Success },
        } as MessageEvent);
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('ignores BroadcastChannel messages for a different connectorId', () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
          onSuccess,
          onError,
        })
      );

      const onMutationSuccess = capturedMutationOptions.onSuccess as (data: {
        authorizationUrl: string;
        state: string;
      }) => void;
      act(() =>
        onMutationSuccess({ authorizationUrl: 'https://oauth.provider/auth', state: 'test-state' })
      );

      const channel = MockBroadcastChannel.instances.find(
        (c) => c.name === OAUTH_BROADCAST_CHANNEL_NAME
      )!;

      act(() => {
        channel.onmessage!({
          data: { connectorId: 'different-id', status: OAuthAuthorizationStatus.Success },
        } as MessageEvent);
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('invokes onError when receiving an error message', () => {
      const onError = vi.fn();
      renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
          onError,
        })
      );

      const onMutationSuccess = capturedMutationOptions.onSuccess as (data: {
        authorizationUrl: string;
        state: string;
      }) => void;
      act(() =>
        onMutationSuccess({ authorizationUrl: 'https://oauth.provider/auth', state: 'test-state' })
      );

      const channel = MockBroadcastChannel.instances.find(
        (c) => c.name === OAUTH_BROADCAST_CHANNEL_NAME
      )!;

      act(() => {
        channel.onmessage!({
          data: {
            connectorId: 'conn-1',
            status: OAuthAuthorizationStatus.Error,
            error: 'Provider denied access',
          },
        } as MessageEvent);
      });

      expect(onError).toHaveBeenCalledWith(new Error('Provider denied access'));
    });
  });

  describe('NewTab mode - timeout', () => {
    it('fires onError when the timeout elapses', () => {
      const onError = vi.fn();
      renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
          timeout: 5000,
          onError,
        })
      );

      const onMutationSuccess = capturedMutationOptions.onSuccess as (data: {
        authorizationUrl: string;
        state: string;
      }) => void;
      act(() =>
        onMutationSuccess({ authorizationUrl: 'https://oauth.provider/auth', state: 'test-state' })
      );

      act(() => vi.advanceTimersByTime(5000));

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) })
      );
    });

    it('does not fire timeout if BroadcastChannel message arrives first', () => {
      const onError = vi.fn();
      const onSuccess = vi.fn();
      renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
          timeout: 5000,
          onSuccess,
          onError,
        })
      );

      const onMutationSuccess = capturedMutationOptions.onSuccess as (data: {
        authorizationUrl: string;
        state: string;
      }) => void;
      act(() =>
        onMutationSuccess({ authorizationUrl: 'https://oauth.provider/auth', state: 'test-state' })
      );

      const channel = MockBroadcastChannel.instances.find(
        (c) => c.name === OAUTH_BROADCAST_CHANNEL_NAME
      )!;

      act(() => {
        channel.onmessage!({
          data: { connectorId: 'conn-1', status: OAuthAuthorizationStatus.Success },
        } as MessageEvent);
      });

      act(() => vi.advanceTimersByTime(5000));

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('mutation onError', () => {
    it('surfaces body.message from an HttpFetchError', () => {
      const onError = vi.fn();
      renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
          onError,
        })
      );

      const onMutationError = capturedMutationOptions.onError as (error: unknown) => void;
      // isHttpFetchError requires `request` to be present on the error (see @kbn/core-http-browser).
      const httpError = Object.assign(new Error('Internal Server Error'), {
        request: {} as Request,
        body: {
          message:
            'EARS base URL not configured. Please set xpack.actions.auth.ears.url in kibana.yml',
        },
      });

      act(() => onMutationError(httpError));

      expect(onError).toHaveBeenCalledWith(
        new Error(
          'EARS base URL not configured. Please set xpack.actions.auth.ears.url in kibana.yml'
        )
      );
    });

    it('falls back to error.message when body.message is absent', () => {
      const onError = vi.fn();
      renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
          onError,
        })
      );

      const onMutationError = capturedMutationOptions.onError as (error: unknown) => void;

      act(() => onMutationError(new Error('Network request failed')));

      expect(onError).toHaveBeenCalledWith(new Error('Network request failed'));
    });
  });

  describe('Redirect mode', () => {
    it('calls window.location.assign on mutation success', () => {
      renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.Redirect,
        })
      );

      const onMutationSuccess = capturedMutationOptions.onSuccess as (data: {
        authorizationUrl: string;
        state: string;
      }) => void;

      act(() => {
        onMutationSuccess({ authorizationUrl: 'https://oauth.provider/auth', state: 'test-state' });
      });

      expect(window.location.assign).toHaveBeenCalledWith('https://oauth.provider/auth');
      expect(window.open).not.toHaveBeenCalled();
    });
  });
});
