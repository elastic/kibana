/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { useEpisodesKpisQuery } from './use_episodes_kpis_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { useSpaceId } from './use_space_id';

jest.mock('../utils/execute_esql_query');
jest.mock('./use_space_id');

const mockExecuteEsqlQuery = jest.mocked(executeEsqlQuery);
const mockUseSpaceId = jest.mocked(useSpaceId);
mockUseSpaceId.mockReturnValue('default');

const mockGetCurrent = jest.fn().mockResolvedValue({ uid: 'user-123' });

const mockServices = {
  expressions: {} as ExpressionsStart,
  spaces: {} as SpacesPluginStart,
  userProfile: { getCurrent: mockGetCurrent } as unknown as CoreStart['userProfile'],
};

const mockTimeRange = {
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-01T02:00:00.000Z',
};

const mockKpisRow = {
  alerts_count: 5,
  firing_rules: 2,
  assigned_to_me: 1,
  unassigned: 3,
  acknowledged: 4,
  snoozed: 0,
};

const wrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

afterEach(() => {
  jest.clearAllMocks();
  mockUseSpaceId.mockReturnValue('default');
  mockGetCurrent.mockResolvedValue({ uid: 'user-123' });
});

describe('useEpisodesKpisQuery', () => {
  it('returns mapped KPI data when the query succeeds', async () => {
    mockExecuteEsqlQuery.mockResolvedValue([mockKpisRow]);

    const { result } = renderHook(
      () =>
        useEpisodesKpisQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
        }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.data).toEqual({
      alertsCount: 5,
      firingRules: 2,
      assignedToMe: 1,
      unassigned: 3,
      acknowledged: 4,
      snoozed: 0,
    });
  });

  it('returns undefined data and isError=true when the query fails', async () => {
    mockExecuteEsqlQuery.mockRejectedValue(new Error('ES|QL error'));

    const { result } = renderHook(
      () =>
        useEpisodesKpisQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
        }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('returns undefined data when ES|QL returns no rows', async () => {
    mockExecuteEsqlQuery.mockResolvedValue([]);

    const { result } = renderHook(
      () =>
        useEpisodesKpisQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
        }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeUndefined();
  });

  it('passes timeRange to executeEsqlQuery input', async () => {
    mockExecuteEsqlQuery.mockResolvedValue([mockKpisRow]);

    renderHook(
      () =>
        useEpisodesKpisQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
        }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalled());
    const inputArg = mockExecuteEsqlQuery.mock.calls[0][0].input as {
      timeRange?: typeof mockTimeRange;
    };
    expect(inputArg.timeRange).toEqual(mockTimeRange);
  });

  it('passes currentUserUid from getCurrent to the query', async () => {
    mockGetCurrent.mockResolvedValue({ uid: 'specific-user-uid' });
    mockExecuteEsqlQuery.mockResolvedValue([mockKpisRow]);

    renderHook(
      () =>
        useEpisodesKpisQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
        }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(mockExecuteEsqlQuery).toHaveBeenCalled());
    const queryArg = mockExecuteEsqlQuery.mock.calls[0][0].query;
    expect(queryArg).toContain('specific-user-uid');
  });

  it('still fetches KPIs when the user has no profile', async () => {
    mockGetCurrent.mockResolvedValue(null);
    mockExecuteEsqlQuery.mockResolvedValue([mockKpisRow]);

    const { result } = renderHook(
      () =>
        useEpisodesKpisQuery({
          services: mockServices,
          filterState: {},
          timeRange: mockTimeRange,
        }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({
      alertsCount: 5,
      firingRules: 2,
      assignedToMe: 1,
      unassigned: 3,
      acknowledged: 4,
      snoozed: 0,
    });
  });
});
