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
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { useSecretParams } from './use_secret_params';

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

describe('useSecretParams', () => {
  const addErrorMock = jest.fn();
  const getMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: { get: getMock },
        notifications: { toasts: { addError: addErrorMock } },
      },
    });
  });

  it('fetches secret parameter keys', async () => {
    getMock.mockResolvedValue(['client_id', 'client_secret']);
    const { result } = renderHook(() => useSecretParams('connector1', true), {
      wrapper: customWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(['client_id', 'client_secret']);
    });
    expect(getMock).toHaveBeenCalledWith('/internal/stack_connectors/connector1/secret_params');
  });

  it('does not fetch without a connector ID', () => {
    const { result } = renderHook(() => useSecretParams(undefined, true), {
      wrapper: customWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('does not fetch outside edit mode', () => {
    const { result } = renderHook(() => useSecretParams('connector1', false), {
      wrapper: customWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('shows a toast when fetching fails', async () => {
    getMock.mockRejectedValue({ body: { message: 'Failed' }, name: 'Error' });

    renderHook(() => useSecretParams('connector1', true), { wrapper: customWrapper() });

    await waitFor(() => {
      expect(addErrorMock).toHaveBeenCalledWith(
        new Error('Failed'),
        expect.objectContaining({
          title: 'Error fetching secret parameters',
        })
      );
    });
  });
});
