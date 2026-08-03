/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import type { GetUserProfileResponse } from '@kbn/core-user-profile-browser';
import { useEpisodesKpisQuery } from './use_episodes_kpis_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { fetchV1AlertsKpis, type V1AlertsKpisRow } from '../apis/classic_alerts_api';
import { useSpaceId } from './use_space_id';

jest.mock('../utils/execute_esql_query');
jest.mock('../apis/classic_alerts_api');
jest.mock('./use_space_id');

const mockExecuteEsqlQuery = jest.mocked(executeEsqlQuery);
const mockFetchV1AlertsKpis = jest.mocked(fetchV1AlertsKpis);
const mockUseSpaceId = jest.mocked(useSpaceId);
mockUseSpaceId.mockReturnValue('default');
// Classic (v1) KPIs are a best-effort overlay; default to "no v1 counts" so the
// existing v2-only expectations are preserved.
mockFetchV1AlertsKpis.mockResolvedValue(undefined as unknown as V1AlertsKpisRow);

const mockUserProfile = userProfileServiceMock.createStart();
mockUserProfile.getCurrent.mockResolvedValue({ uid: 'user-123' } as GetUserProfileResponse);

const mockServices = {
  expressions: expressionsPluginMock.createStartContract(),
  spaces: spacesPluginMock.createStartContract(),
  userProfile: mockUserProfile,
  http: httpServiceMock.createStartContract(),
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
  mockFetchV1AlertsKpis.mockResolvedValue(undefined as unknown as V1AlertsKpisRow);
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
    mockUserProfile.getCurrent.mockResolvedValue({
      uid: 'specific-user-uid',
    } as GetUserProfileResponse);
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
    // `getCurrent` resolves `null` at runtime for anonymous or proxy-authenticated
    // users, even though its return type is non-nullable.
    mockUserProfile.getCurrent.mockResolvedValue(null as unknown as GetUserProfileResponse);
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

  it('merges classic (v1) KPI counts additively with v2 counts', async () => {
    mockExecuteEsqlQuery.mockResolvedValue([mockKpisRow]);
    mockFetchV1AlertsKpis.mockResolvedValue({
      alerts_count: 10,
      firing_rules: 3,
      acknowledged: 2,
      snoozed: 1,
    });

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

    expect(result.current.data).toEqual({
      alertsCount: 15, // 5 v2 + 10 v1
      firingRules: 5, // 2 v2 + 3 v1
      assignedToMe: 1, // v2 only (v1 has no assignee)
      unassigned: 13, // 3 v2 + 10 v1 (all v1 alerts are unassigned)
      acknowledged: 6, // 4 v2 + 2 v1
      snoozed: 1, // 0 v2 + 1 v1
    });
  });

  it('returns v2-only KPIs when the v1 fetch fails gracefully', async () => {
    mockExecuteEsqlQuery.mockResolvedValue([mockKpisRow]);
    mockFetchV1AlertsKpis.mockRejectedValue(new Error('v1 fetch failed'));

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
