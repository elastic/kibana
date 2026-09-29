/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

/* eslint-disable no-console */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useSecretHeaders } from './use_secret_headers';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';

vi.mock('@kbn/triggers-actions-ui-plugin/public', () => {
  const mocked = {
    useKibana: vi.fn().mockReturnValue({}),
  };
  return { ...mocked, default: mocked };
});

const customWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSecretHeaders', () => {
  const addErrorMock = vi.fn();
  const getMock = vi.fn();

  const mockServices = {
    http: { get: getMock },
    notifications: { toasts: { addError: addErrorMock } },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useKibana as Mock).mockReturnValue({
      services: mockServices,
    });
  });

  it('fetches secret headers successfully', async () => {
    getMock.mockResolvedValue(['secretHeader1', 'secretHeader2']);
    const { result } = renderHook(() => useSecretHeaders('connector1', true), {
      wrapper: customWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(['secretHeader1', 'secretHeader2']);
    });

    expect(getMock).toHaveBeenCalledWith('/internal/stack_connectors/connector1/secret_headers');
  });

  it('returns empty array if connectorId is undefined', async () => {
    const { result } = renderHook(() => useSecretHeaders(undefined, true), {
      wrapper: customWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('returns empty array if isEdit is false', async () => {
    const { result } = renderHook(() => useSecretHeaders('connector1', false), {
      wrapper: customWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('calls toasts.addError when fetching the secret headers fails', async () => {
    const error = { body: { message: 'Failed' }, name: 'Error' };
    getMock.mockRejectedValue(error);

    renderHook(() => useSecretHeaders('connector1', true), { wrapper: customWrapper() });

    await waitFor(() => {
      expect(addErrorMock).toHaveBeenCalledWith(
        new Error('Failed'),
        expect.objectContaining({
          title: 'Error fetching secret headers',
        })
      );
    });
  });

  it('does not refetch secret headers on window focus', async () => {
    getMock.mockResolvedValue(['secret-key']);
    const { result } = renderHook(() => useSecretHeaders('connector1', true), {
      wrapper: customWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(['secret-key']);
    });
    expect(getMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        writable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(['secret-key']);
  });
});
