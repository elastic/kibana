/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useSecretQueryParams } from './use_secret_query_params';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => ({
  useKibana: jest.fn().mockReturnValue({}),
}));

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

describe('useSecretQueryParams', () => {
  const addErrorMock = jest.fn();
  const getMock = jest.fn();

  const mockServices = {
    http: { get: getMock },
    notifications: { toasts: { addError: addErrorMock } },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: mockServices,
    });
  });

  it('fetches secret query params successfully', async () => {
    getMock.mockResolvedValue(['apiKey', 'token']);
    const { result } = renderHook(() => useSecretQueryParams('connector1', true), {
      wrapper: customWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(['apiKey', 'token']);
    });

    expect(getMock).toHaveBeenCalledWith(
      '/internal/stack_connectors/connector1/secret_query_params'
    );
  });

  it('returns empty array if connectorId is undefined', async () => {
    const { result } = renderHook(() => useSecretQueryParams(undefined, true), {
      wrapper: customWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('does not fetch when isEdit is false', async () => {
    getMock.mockResolvedValue(['apiKey']);
    const { result } = renderHook(() => useSecretQueryParams('connector1', false), {
      wrapper: customWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('calls toasts.addError when fetching the secret query params fails', async () => {
    const error = { body: { message: 'Failed' }, name: 'Error' };
    getMock.mockRejectedValue(error);

    renderHook(() => useSecretQueryParams('connector1', true), { wrapper: customWrapper() });

    await waitFor(() => {
      expect(addErrorMock).toHaveBeenCalledWith(
        new Error('Failed'),
        expect.objectContaining({
          title: 'Error fetching secret query parameters',
        })
      );
    });
  });
});
