/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { useSecretParams, useSecretQueryParams } from './use_secret_keys';

jest.mock('@kbn/triggers-actions-ui-plugin/public', () => ({
  useKibana: jest.fn().mockReturnValue({}),
}));

const customWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('secret key hooks', () => {
  const addError = jest.fn();
  const get = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: { get },
        notifications: { toasts: { addError } },
      },
    });
  });

  it.each([
    {
      hook: useSecretParams,
      keys: ['client_id', 'client_secret'],
      path: 'secret_params',
      errorTitle: 'Error fetching secret parameters',
    },
    {
      hook: useSecretQueryParams,
      keys: ['apiKey', 'token'],
      path: 'secret_query_params',
      errorTitle: 'Error fetching secret query parameters',
    },
  ])('fetches and reports errors for $path', async ({ hook, keys, path, errorTitle }) => {
    get.mockResolvedValueOnce(keys);
    const { result, unmount } = renderHook(() => hook('connector/id', true), {
      wrapper: customWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(keys));
    expect(get).toHaveBeenCalledWith(`/internal/stack_connectors/connector%2Fid/${path}`);
    unmount();

    get.mockRejectedValueOnce({ body: { message: 'Failed' }, name: 'Error' });
    renderHook(() => hook('connector1', true), { wrapper: customWrapper() });

    await waitFor(() =>
      expect(addError).toHaveBeenCalledWith(
        new Error('Failed'),
        expect.objectContaining({ title: errorTitle })
      )
    );
  });

  it.each([undefined, ''])('does not fetch without a connector ID', (connectorId) => {
    const { result } = renderHook(() => useSecretParams(connectorId, true), {
      wrapper: customWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });

  it('does not fetch outside edit mode', () => {
    const { result } = renderHook(() => useSecretParams('connector1', false), {
      wrapper: customWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });
});
