/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider, QueryClient } from '@kbn/react-query';
import { useKibana } from '../../../common/lib/kibana';
import type { LiveQueryDetailsItem } from '../../../actions/use_live_query_details';
import { useSaveQueryFromDetails } from './use_save_query_from_details';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/hooks/use_error_toast', () => ({
  useErrorToast: () => jest.fn(),
}));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return Wrapper;
};

const createMockData = (overrides: Partial<LiveQueryDetailsItem> = {}): LiveQueryDetailsItem => ({
  action_id: 'test-action-id',
  '@timestamp': '2026-04-07T00:00:00Z',
  agent_all: true,
  agent_ids: ['agent-1'],
  agent_platforms: ['linux'],
  agent_policy_ids: ['policy-1'],
  queries: [
    {
      action_id: 'query-action-id',
      id: 'query-id',
      query: 'select * from users;',
      agents: ['agent-1'],
      ecs_mapping: { 'user.name': { field: 'username' } },
      timeout: 300,
    },
  ],
  ...overrides,
});

describe('useSaveQueryFromDetails', () => {
  let mockHttp: { get: jest.Mock };
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp = { get: jest.fn() };
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
      logger: { log: () => null, warn: () => null, error: () => null },
    });

    useKibanaMock.mockReturnValue({
      services: {
        http: mockHttp,
        application: {
          capabilities: {
            osquery: {
              writeSavedQueries: true,
            },
          },
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('should allow save for single-query actions with write permission', () => {
    const data = createMockData();

    const { result } = renderHook(() => useSaveQueryFromDetails({ data }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.canSave).toBe(true);
  });

  it('should not allow save for pack-based actions', () => {
    const data = createMockData({ pack_id: 'some-pack' });

    const { result } = renderHook(() => useSaveQueryFromDetails({ data }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.canSave).toBe(false);
  });

  it('should not allow save for multi-query actions', () => {
    const data = createMockData({
      queries: [
        { action_id: 'q1', id: '1', query: 'select 1;', agents: [] },
        { action_id: 'q2', id: '2', query: 'select 2;', agents: [] },
      ],
    });

    const { result } = renderHook(() => useSaveQueryFromDetails({ data }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.canSave).toBe(false);
  });

  it('should not allow save without writeSavedQueries permission', () => {
    useKibanaMock.mockReturnValue({
      services: {
        http: mockHttp,
        application: {
          capabilities: {
            osquery: { writeSavedQueries: false },
          },
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    const data = createMockData();

    const { result } = renderHook(() => useSaveQueryFromDetails({ data }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.canSave).toBe(false);
  });

  it('should build defaultValue from action query data', () => {
    const data = createMockData();

    const { result } = renderHook(() => useSaveQueryFromDetails({ data }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.savedQueryDefaultValue).toEqual({
      query: 'select * from users;',
      ecs_mapping: { 'user.name': { field: 'username' } },
      timeout: 300,
    });
  });

  it('should enrich defaultValue from saved query when saved_query_id exists', async () => {
    const data = createMockData({
      queries: [
        {
          action_id: 'query-action-id',
          id: 'query-id',
          query: 'select * from users;',
          agents: ['agent-1'],
          ecs_mapping: { 'user.name': { field: 'username' } },
          timeout: 300,
          saved_query_id: 'my-saved-query',
        },
      ],
    });

    mockHttp.get.mockResolvedValue({
      data: [
        {
          id: 'my-saved-query',
          description: 'List all users',
          platform: 'linux,darwin',
          version: '5.0.0',
          interval: '3600',
          query: 'select * from users;',
        },
      ],
    });

    const { result } = renderHook(() => useSaveQueryFromDetails({ data }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() =>
      expect(result.current.savedQueryDefaultValue.description).toBe('List all users')
    );

    expect(mockHttp.get).toHaveBeenCalledWith('/api/osquery/saved_queries', {
      version: '2023-10-31',
      query: { id: 'my-saved-query', pageSize: 1 },
    });

    expect(result.current.savedQueryDefaultValue).toEqual({
      query: 'select * from users;',
      ecs_mapping: { 'user.name': { field: 'username' } },
      timeout: 300,
      description: 'List all users',
      platform: 'linux,darwin',
      version: '5.0.0',
      interval: '3600',
    });
  });

  it('should fall back to base data when saved query fetch fails', async () => {
    const data = createMockData({
      queries: [
        {
          action_id: 'query-action-id',
          id: 'query-id',
          query: 'select * from users;',
          agents: ['agent-1'],
          saved_query_id: 'deleted-query',
        },
      ],
    });

    mockHttp.get.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useSaveQueryFromDetails({ data }), {
      wrapper: createWrapper(queryClient),
    });

    // Wait for query to settle
    await waitFor(() => expect(mockHttp.get).toHaveBeenCalled());

    expect(result.current.savedQueryDefaultValue).toEqual({
      query: 'select * from users;',
      ecs_mapping: undefined,
      timeout: undefined,
    });
  });

  it('should not fetch saved query when saved_query_id is absent', () => {
    const data = createMockData();

    renderHook(() => useSaveQueryFromDetails({ data }), {
      wrapper: createWrapper(queryClient),
    });

    expect(mockHttp.get).not.toHaveBeenCalled();
  });

  it('should toggle flyout visibility', () => {
    const data = createMockData();

    const { result } = renderHook(() => useSaveQueryFromDetails({ data }), {
      wrapper: createWrapper(queryClient),
    });

    expect(result.current.showSavedQueryFlyout).toBe(false);

    act(() => result.current.handleShowSaveQueryFlyout());
    expect(result.current.showSavedQueryFlyout).toBe(true);

    act(() => result.current.handleCloseSaveQueryFlyout());
    expect(result.current.showSavedQueryFlyout).toBe(false);
  });
});
