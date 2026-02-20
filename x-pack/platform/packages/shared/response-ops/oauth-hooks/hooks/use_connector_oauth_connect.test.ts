/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/kibana-react-plugin/public');

const mockUseMutation = jest.fn();
jest.mock('@kbn/react-query', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

import { renderHook, act } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useConnectorOAuthConnect, OAuthRedirectMode } from './use_connector_oauth_connect';
import { OAuthAuthorizationStatus } from '@kbn/actions-plugin/common';
import { OAUTH_BROADCAST_CHANNEL_NAME } from '../oauth';

const mockHttpPost = jest.fn();
(useKibana as jest.Mock).mockReturnValue({ services: { http: { post: mockHttpPost } } });

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  close = jest.fn();

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  postMessage = jest.fn();
}

describe('useConnectorOAuthConnect', () => {
  const originalBroadcastChannel = globalThis.BroadcastChannel;
  const originalWindowOpen = window.open;
  const originalLocationAssign = window.location.assign;

  let mockMutate: jest.Mock;
  let capturedMutationOptions: Record<string, unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    MockBroadcastChannel.instances = [];
    globalThis.BroadcastChannel = MockBroadcastChannel as never;
    window.open = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: jest.fn(), href: 'http://localhost/app/connectors' },
      writable: true,
    });

    mockMutate = jest.fn();
    mockUseMutation.mockImplementation((options: Record<string, unknown>) => {
      capturedMutationOptions = options;
      return { mutate: mockMutate, isLoading: false };
    });

    mockHttpPost.mockResolvedValue({
      authorizationUrl: 'https://oauth.provider/authorize?code=abc',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
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
          onSuccess: jest.fn(),
        })
      );

      const onMutationSuccess = capturedMutationOptions.onSuccess as (data: {
        authorizationUrl: string;
      }) => void;

      act(() => {
        onMutationSuccess({ authorizationUrl: 'https://oauth.provider/auth' });
      });

      expect(window.open).toHaveBeenCalledWith('https://oauth.provider/auth', '_blank', 'noopener');
      expect(result.current.isAwaitingCallback).toBe(true);
    });
  });

  describe('NewTab mode - BroadcastChannel', () => {
    it('invokes onSuccess when receiving a success message for the matching connectorId', () => {
      const onSuccess = jest.fn();
      renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
          onSuccess,
        })
      );

      const onMutationSuccess = capturedMutationOptions.onSuccess as (data: {
        authorizationUrl: string;
      }) => void;
      act(() => onMutationSuccess({ authorizationUrl: 'https://oauth.provider/auth' }));

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
      const onSuccess = jest.fn();
      const onError = jest.fn();
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
      }) => void;
      act(() => onMutationSuccess({ authorizationUrl: 'https://oauth.provider/auth' }));

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
      const onError = jest.fn();
      renderHook(() =>
        useConnectorOAuthConnect({
          connectorId: 'conn-1',
          redirectMode: OAuthRedirectMode.NewTab,
          onError,
        })
      );

      const onMutationSuccess = capturedMutationOptions.onSuccess as (data: {
        authorizationUrl: string;
      }) => void;
      act(() => onMutationSuccess({ authorizationUrl: 'https://oauth.provider/auth' }));

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
      const onError = jest.fn();
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
      }) => void;
      act(() => onMutationSuccess({ authorizationUrl: 'https://oauth.provider/auth' }));

      act(() => jest.advanceTimersByTime(5000));

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.any(String) })
      );
    });

    it('does not fire timeout if BroadcastChannel message arrives first', () => {
      const onError = jest.fn();
      const onSuccess = jest.fn();
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
      }) => void;
      act(() => onMutationSuccess({ authorizationUrl: 'https://oauth.provider/auth' }));

      const channel = MockBroadcastChannel.instances.find(
        (c) => c.name === OAUTH_BROADCAST_CHANNEL_NAME
      )!;

      act(() => {
        channel.onmessage!({
          data: { connectorId: 'conn-1', status: OAuthAuthorizationStatus.Success },
        } as MessageEvent);
      });

      act(() => jest.advanceTimersByTime(5000));

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
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
      }) => void;

      act(() => {
        onMutationSuccess({ authorizationUrl: 'https://oauth.provider/auth' });
      });

      expect(window.location.assign).toHaveBeenCalledWith('https://oauth.provider/auth');
      expect(window.open).not.toHaveBeenCalled();
    });
  });
});
