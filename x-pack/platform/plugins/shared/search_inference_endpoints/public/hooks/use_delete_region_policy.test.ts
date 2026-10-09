/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useDeleteRegionPolicy } from './use_delete_region_policy';
import { useKibana } from './use_kibana';
import { APIRoutes } from '../../common/types';
import { REGION_POLICY_QUERY_KEY, ROUTE_VERSIONS } from '../../common/constants';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useDeleteRegionPolicy', () => {
  const mockDelete = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddError = jest.fn();
  const mockAddDanger = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        http: { delete: mockDelete },
        notifications: {
          toasts: {
            addSuccess: mockAddSuccess,
            addError: mockAddError,
            addDanger: mockAddDanger,
          },
        },
      },
    });
  });

  it('calls DELETE with the correct path and version', async () => {
    mockDelete.mockResolvedValue({ acknowledged: true });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteRegionPolicy(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(1));

    expect(mockDelete).toHaveBeenCalledWith(APIRoutes.REGION_POLICY, {
      version: ROUTE_VERSIONS.v1,
    });
  });

  it('shows success toast and writes the cleared policy directly to the query cache', async () => {
    mockDelete.mockResolvedValue({ acknowledged: true });

    const { queryClient } = createWrapper();
    queryClient.setQueryData([REGION_POLICY_QUERY_KEY], {
      region_policy: { allowed_geos: ['eu'] },
    });

    const { result } = renderHook(() => useDeleteRegionPolicy(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(mockAddSuccess).toHaveBeenCalledTimes(1));

    expect(mockAddSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Region preferences reset to default' })
    );
    expect(queryClient.getQueryData([REGION_POLICY_QUERY_KEY])).toBeNull();
  });

  it('shows error toast on generic error and leaves the query cache untouched', async () => {
    const serverError = new Error('server error');
    mockDelete.mockRejectedValue(serverError);

    const { queryClient } = createWrapper();
    const existingPolicy = { region_policy: { allowed_geos: ['eu'] } };
    queryClient.setQueryData([REGION_POLICY_QUERY_KEY], existingPolicy);

    const { result } = renderHook(() => useDeleteRegionPolicy(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(1));

    expect(mockAddError).toHaveBeenCalledWith(
      serverError,
      expect.objectContaining({ title: 'Failed to reset region preferences' })
    );
    expect(queryClient.getQueryData([REGION_POLICY_QUERY_KEY])).toBe(existingPolicy);
  });

  it('calls the onSuccess callback after a successful delete', async () => {
    mockDelete.mockResolvedValue({ acknowledged: true });
    const onSuccess = jest.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteRegionPolicy(onSuccess), { wrapper: Wrapper });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('does not call the onSuccess callback when delete fails', async () => {
    mockDelete.mockRejectedValue(new Error('server error'));
    const onSuccess = jest.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteRegionPolicy(onSuccess), { wrapper: Wrapper });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(1));

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows a danger toast with the reason on a 409 conflict and leaves the query cache untouched', async () => {
    const conflictError = Object.assign(new Error('Conflict'), {
      response: { status: 409 },
      body: { message: 'Region policy is currently in use.' },
    });
    mockDelete.mockRejectedValue(conflictError);

    const { queryClient } = createWrapper();
    const existingPolicy = { region_policy: { allowed_geos: ['eu'] } };
    queryClient.setQueryData([REGION_POLICY_QUERY_KEY], existingPolicy);

    const { result } = renderHook(() => useDeleteRegionPolicy(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    });

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(mockAddDanger).toHaveBeenCalledTimes(1));

    expect(mockAddDanger).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Can't reset region preferences",
        text: 'Region policy is currently in use.',
      })
    );
    expect(mockAddError).not.toHaveBeenCalled();
    expect(queryClient.getQueryData([REGION_POLICY_QUERY_KEY])).toBe(existingPolicy);
  });
});
