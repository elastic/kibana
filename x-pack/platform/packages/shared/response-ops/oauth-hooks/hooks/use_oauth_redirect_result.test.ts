/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const mockReplace = jest.fn();
jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
  useHistory: jest.fn(() => ({ replace: mockReplace })),
}));

import { renderHook } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { useOAuthRedirectResult } from './use_oauth_redirect_result';
import { OAUTH_BROADCAST_CHANNEL_NAME } from '../oauth';

const useLocationMock = useLocation as jest.MockedFunction<typeof useLocation>;

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  name: string;
  messages: unknown[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown) {
    this.messages.push(data);
  }

  close = jest.fn();
}

describe('useOAuthRedirectResult', () => {
  const originalBroadcastChannel = globalThis.BroadcastChannel;
  const originalWindowClose = window.close;

  beforeEach(() => {
    jest.clearAllMocks();
    MockBroadcastChannel.instances = [];
    globalThis.BroadcastChannel = MockBroadcastChannel as never;
    window.close = jest.fn();
  });

  afterEach(() => {
    globalThis.BroadcastChannel = originalBroadcastChannel;
    window.close = originalWindowClose;
  });

  const setLocation = (search: string, pathname = '/app/connectors') => {
    useLocationMock.mockReturnValue({
      search,
      pathname,
      hash: '',
      state: undefined,
      key: 'default',
    });
  };

  it('does nothing when no oauth_authorization param is present', () => {
    setLocation('');
    const onSuccess = jest.fn();
    const onError = jest.fn();

    renderHook(() => useOAuthRedirectResult({ onSuccess, onError }));

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does nothing when connector_id param is missing', () => {
    setLocation('?oauth_authorization=success');
    const onSuccess = jest.fn();

    renderHook(() => useOAuthRedirectResult({ onSuccess }));

    expect(onSuccess).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('calls onSuccess and broadcasts success message', () => {
    setLocation('?oauth_authorization=success&connector_id=conn-1');
    const onSuccess = jest.fn();

    renderHook(() => useOAuthRedirectResult({ onSuccess }));

    expect(onSuccess).toHaveBeenCalledWith('conn-1');
    expect(MockBroadcastChannel.instances).toHaveLength(1);
    expect(MockBroadcastChannel.instances[0].name).toBe(OAUTH_BROADCAST_CHANNEL_NAME);
    expect(MockBroadcastChannel.instances[0].messages).toEqual([
      { connectorId: 'conn-1', status: 'success' },
    ]);
    expect(MockBroadcastChannel.instances[0].close).toHaveBeenCalled();
  });

  it('calls onError and broadcasts error message when authorization fails', () => {
    setLocation('?oauth_authorization=error&connector_id=conn-2');
    const onError = jest.fn();

    renderHook(() => useOAuthRedirectResult({ onError }));

    expect(onError).toHaveBeenCalledWith('conn-2', expect.any(Error));
    expect(MockBroadcastChannel.instances[0].messages).toEqual([
      { connectorId: 'conn-2', status: 'error', error: expect.any(String) },
    ]);
  });

  it('replaces the URL with OAuth params stripped', () => {
    setLocation('?oauth_authorization=success&connector_id=conn-1&page=2');

    renderHook(() => useOAuthRedirectResult({}));

    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('page=2'));
    expect(mockReplace).toHaveBeenCalledWith(expect.not.stringContaining('oauth_authorization'));
    expect(mockReplace).toHaveBeenCalledWith(expect.not.stringContaining('connector_id'));
  });

  it('calls window.close() when auto_close=true', () => {
    setLocation('?oauth_authorization=success&connector_id=conn-1&auto_close=true');

    renderHook(() => useOAuthRedirectResult({}));

    expect(window.close).toHaveBeenCalled();
  });

  it('does not call window.close() when auto_close is absent', () => {
    setLocation('?oauth_authorization=success&connector_id=conn-1');

    renderHook(() => useOAuthRedirectResult({}));

    expect(window.close).not.toHaveBeenCalled();
  });
});
