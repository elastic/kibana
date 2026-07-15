/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { useSaveRegionPolicy } from './use_save_region_policy';
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

describe('useSaveRegionPolicy', () => {
  const mockPut = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddError = jest.fn();
  const mockAddDanger = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        http: { put: mockPut },
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

  it('calls PUT with the correct path, body, and version', async () => {
    const responseData = {
      region_policy: { allowed_regions: [{ csp: 'aws', region: 'eu-west-1' }] },
      created_at: '2026-01-01',
    };
    mockPut.mockResolvedValue(responseData);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveRegionPolicy(), { wrapper: Wrapper });

    const body = { allowed_regions: [{ csp: 'aws', region: 'eu-west-1' }] };

    act(() => {
      result.current.mutate(body);
    });

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));

    expect(mockPut).toHaveBeenCalledWith(APIRoutes.REGION_POLICY, {
      body: JSON.stringify(body),
      version: ROUTE_VERSIONS.v1,
    });
  });

  it('shows success toast and invalidates query cache on success', async () => {
    const responseData = {
      region_policy: { allowed_regions: [{ csp: 'aws', region: 'eu-west-1' }] },
      created_at: '2026-01-01',
    };
    mockPut.mockResolvedValue(responseData);

    const { queryClient } = createWrapper();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSaveRegionPolicy(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    });

    act(() => {
      result.current.mutate({ allowed_regions: [{ csp: 'aws', region: 'eu-west-1' }] });
    });

    await waitFor(() => expect(mockAddSuccess).toHaveBeenCalledTimes(1));

    expect(mockAddSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Region preferences saved' })
    );
    expect(invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: [REGION_POLICY_QUERY_KEY] })
    );
  });

  it('shows error toast on error', async () => {
    const serverError = new Error('server error');
    mockPut.mockRejectedValue(serverError);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveRegionPolicy(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ allowed_regions: [] });
    });

    await waitFor(() => expect(mockAddError).toHaveBeenCalledTimes(1));

    expect(mockAddError).toHaveBeenCalledWith(
      serverError,
      expect.objectContaining({ title: 'Failed to save region preferences' })
    );
  });

  it('shows a danger toast with the reason on a 409 conflict', async () => {
    const conflictError = Object.assign(new Error('Conflict'), {
      response: { status: 409 },
      body: { message: 'Policy would deny endpoints currently in use.' },
    });
    mockPut.mockRejectedValue(conflictError);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveRegionPolicy(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ allowed_regions: [] });
    });

    await waitFor(() => expect(mockAddDanger).toHaveBeenCalledTimes(1));

    expect(mockAddDanger).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Region policy update blocked',
        text: 'Policy would deny endpoints currently in use.',
      })
    );
    expect(mockAddError).not.toHaveBeenCalled();
  });
});
