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
import { useRegionPreferencesRedesignEnabled } from './use_region_preferences_redesign_enabled';
import { APIRoutes } from '../../common/types';
import {
  INFERENCE_ENDPOINTS_QUERY_KEY,
  REGION_POLICY_QUERY_KEY,
  ROUTE_VERSIONS,
} from '../../common/constants';

jest.mock('./use_kibana');
jest.mock('./use_region_preferences_redesign_enabled');

const mockUseKibana = useKibana as jest.Mock;
const mockUseRegionPreferencesRedesignEnabled = jest.mocked(useRegionPreferencesRedesignEnabled);

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
    mockUseRegionPreferencesRedesignEnabled.mockReturnValue(false);
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
      result.current.mutate({ body });
    });

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));

    expect(mockPut).toHaveBeenCalledWith(APIRoutes.REGION_POLICY, {
      body: JSON.stringify(body),
      version: ROUTE_VERSIONS.v1,
    });
  });

  it('shows success toast and writes the saved policy directly to the query cache', async () => {
    const responseData = {
      region_policy: { allowed_regions: [{ csp: 'aws', region: 'eu-west-1' }] },
      created_at: '2026-01-01',
    };
    mockPut.mockResolvedValue(responseData);

    const { queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSaveRegionPolicy(), {
      wrapper: ({ children }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    });

    act(() => {
      result.current.mutate({ body: { allowed_regions: [{ csp: 'aws', region: 'eu-west-1' }] } });
    });

    await waitFor(() => expect(mockAddSuccess).toHaveBeenCalledTimes(1));

    expect(mockAddSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Region preferences saved' })
    );
    expect(queryClient.getQueryData([REGION_POLICY_QUERY_KEY])).toEqual(responseData);
    expect(invalidateSpy).toHaveBeenCalledWith([INFERENCE_ENDPOINTS_QUERY_KEY]);
  });

  it('shows error toast on error', async () => {
    const serverError = new Error('server error');
    mockPut.mockRejectedValue(serverError);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveRegionPolicy(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ body: { allowed_regions: [] } });
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
      result.current.mutate({ body: { allowed_regions: [] } });
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

  it('sends force=true as a query parameter when retrying with force', async () => {
    mockPut.mockResolvedValue({
      region_policy: { allowed_geos: ['eu'] },
      created_at: '2026-01-01',
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveRegionPolicy(), { wrapper: Wrapper });
    const body = { allowed_geos: ['eu'] };

    act(() => {
      result.current.mutate({ body, force: true });
    });

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));

    expect(mockPut).toHaveBeenCalledWith(APIRoutes.REGION_POLICY, {
      body: JSON.stringify(body),
      version: ROUTE_VERSIONS.v1,
      query: { force: true },
    });
  });

  it('still toasts an in-use 409 when the redesign flag is off', async () => {
    const conflictError = Object.assign(new Error('Conflict'), {
      response: { status: 409 },
      body: {
        message: 'Policy would deny endpoints currently in use.',
        attributes: {
          denied_endpoint_ids: ['.elser-2-elastic'],
          referencing_indexes: ['.elser-2-elastic:my-index'],
        },
      },
    });
    mockPut.mockRejectedValue(conflictError);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveRegionPolicy(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ body: { allowed_geos: ['eu'] } });
    });

    await waitFor(() => expect(mockAddDanger).toHaveBeenCalledTimes(1));
  });

  it('skips the in-use 409 toast when the redesign flag is on', async () => {
    mockUseRegionPreferencesRedesignEnabled.mockReturnValue(true);
    const conflictError = Object.assign(new Error('Conflict'), {
      response: { status: 409 },
      body: {
        message: 'Policy would deny endpoints currently in use.',
        attributes: {
          denied_endpoint_ids: ['.elser-2-elastic'],
          referencing_indexes: ['.elser-2-elastic:my-index'],
        },
      },
    });
    mockPut.mockRejectedValue(conflictError);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveRegionPolicy(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ body: { allowed_geos: ['eu'] } });
    });

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));

    expect(mockAddDanger).not.toHaveBeenCalled();
    expect(mockAddError).not.toHaveBeenCalled();
  });

  it('toasts a concurrent-update 409 even when the redesign flag is on', async () => {
    mockUseRegionPreferencesRedesignEnabled.mockReturnValue(true);
    const conflictError = Object.assign(new Error('Conflict'), {
      response: { status: 409 },
      body: { message: 'Failed to put region policy due to a concurrent update conflict.' },
    });
    mockPut.mockRejectedValue(conflictError);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveRegionPolicy(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ body: { allowed_geos: ['eu'] } });
    });

    await waitFor(() => expect(mockAddDanger).toHaveBeenCalledTimes(1));
    expect(mockAddError).not.toHaveBeenCalled();
  });
});
