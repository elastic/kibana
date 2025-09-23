/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSecretHeaders } from './use_secret_headers';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => ({
  useKibana: jest.fn().mockReturnValue({}),
}));

const customWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSecretHeaders', () => {
  const addErrorMock = jest.fn();
  const getMock = jest.fn();
  const queryClient = new QueryClient();

  const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

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

  it('fetches secret headers successfully', async () => {
    getMock.mockResolvedValue(['secretHeader1', 'secretHeader2']);
    const { result } = renderHook(() => useSecretHeaders('connector1'), { wrapper });

    await waitFor(() => {
      expect(result.current).toEqual([
        { key: 'secretHeader1', value: '', type: 'secret' },
        { key: 'secretHeader2', value: '', type: 'secret' },
      ]);
    });

    expect(getMock).toHaveBeenCalledWith('/internal/stack_connectors/connector1/secret_headers');
  });

  it('returns empty array if connectorId is undefined', async () => {
    const { result } = renderHook(() => useSecretHeaders(undefined), { wrapper });

    expect(result.current).toEqual([]);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('calls toasts.addError when fetching the secret headers fails', async () => {
    const error = { body: { message: 'Failed' }, name: 'Error' };
    getMock.mockRejectedValue(error);

    renderHook(() => useSecretHeaders('connector1'), { wrapper: customWrapper() });

    await waitFor(() => {
      expect(addErrorMock).toHaveBeenCalledWith(
        new Error('Failed'),
        expect.objectContaining({
          title: 'Error fetching secret headers',
        })
      );
    });
  });
});
