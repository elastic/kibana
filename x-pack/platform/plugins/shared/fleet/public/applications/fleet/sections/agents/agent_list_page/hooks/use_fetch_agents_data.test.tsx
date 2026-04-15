/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';

import { useStartServices } from '../../../../hooks';

import { ExperimentalFeaturesService } from '../../../../services';
import { createFleetTestRendererMock } from '../../../../../../mock';

import { useFetchAgentsData } from './use_fetch_agents_data';

jest.mock('../../../../../../services/experimental_features');
const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);

const defaultState = {
  search: '',
  selectedAgentPolicies: [],
  selectedStatus: ['healthy', 'unhealthy', 'orphaned', 'updating', 'offline'],
  selectedTags: [],
  showUpgradeable: false,
  sort: { field: 'enrolled_at', direction: 'desc' },
  page: { index: 0, size: 20 },
};

jest.mock('./use_session_agent_list_state', () => {
  let currentMockState = { ...defaultState };

  const mockUseSessionAgentListState = jest.fn(() => {
    const mockUpdateTableState = jest.fn((updates: any) => {
      currentMockState = { ...currentMockState, ...updates };
    });

    return {
      ...currentMockState,
      updateTableState: mockUpdateTableState,
      onTableChange: jest.fn(),
      clearFilters: jest.fn(),
      resetToDefaults: jest.fn(),
    };
  });

  return {
    useSessionAgentListState: mockUseSessionAgentListState,
    getDefaultAgentListState: jest.fn(() => defaultState),
    defaultAgentListState: defaultState,
  };
});

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  sendGetAgentsForRq: jest.fn().mockResolvedValue({
    statusSummary: {},
    items: [
      {
        id: 'agent123',
        policy_id: 'agent-policy-1',
      },
    ],
    total: 5,
  }),
  sendGetAgentStatus: jest.fn().mockResolvedValue({
    data: {
      results: {
        inactive: 2,
      },
      totalInactive: 2,
    },
  }),
  sendBulkGetAgentPoliciesForRq: jest.fn().mockReturnValue({
    items: [
      { id: 'agent-policy-1', name: 'Agent policy 1', namespace: 'default' },
      {
        id: 'agent-policy-managed',
        name: 'Managed Agent policy',
        namespace: 'default',
        managed: true,
      },
    ],
  }),
  sendGetAgentPolicies: jest.fn().mockReturnValue({
    data: {
      items: [
        { id: 'agent-policy-1', name: 'Agent policy 1', namespace: 'default' },
        {
          id: 'agent-policy-managed',
          name: 'Managed Agent policy',
          namespace: 'default',
          managed: true,
        },
      ],
    },
  }),
  useGetAgentPolicies: jest.fn().mockReturnValue({
    data: {
      items: [
        { id: 'agent-policy-1', name: 'Agent policy 1', namespace: 'default' },
        {
          id: 'agent-policy-managed',
          name: 'Managed Agent policy',
          namespace: 'default',
          managed: true,
        },
      ],
    },
    error: undefined,
    isLoading: false,
    resendRequest: jest.fn(),
  } as any),
  sendGetAgentTagsForRq: jest.fn().mockReturnValue({ items: ['tag1', 'tag2'] }),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addError: jest.fn(),
      },
    },
    cloud: {},
    data: { dataViews: { getFieldsForWildcard: jest.fn() } },
  }),
}));

describe('useFetchAgentsData', () => {
  const startServices = useStartServices();
  const mockErrorToast = startServices.notifications.toasts.addError as jest.Mock;

  beforeAll(() => {
    mockedExperimentalFeaturesService.get.mockReturnValue({} as any);
  });

  beforeEach(() => {
    mockErrorToast.mockReset();
    mockErrorToast.mockResolvedValue({});
    // Reset sendGetAgentTagsForRq to default value
    const { sendGetAgentTagsForRq } = jest.requireMock('../../../../hooks');
    sendGetAgentTagsForRq.mockReturnValue({ items: ['tag1', 'tag2'] });
  });

  it('should fetch agents and agent policies data', async () => {
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useFetchAgentsData());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result?.current.selectedStatus).toEqual([
      'healthy',
      'unhealthy',
      'orphaned',
      'updating',
      'offline',
    ]);
    expect(result?.current.allAgentPolicies).toEqual([
      {
        id: 'agent-policy-1',
        name: 'Agent policy 1',
        namespace: 'default',
      },
      {
        id: 'agent-policy-managed',
        managed: true,
        name: 'Managed Agent policy',
        namespace: 'default',
      },
    ]);

    expect(result?.current.agentPoliciesIndexedById).toEqual({
      'agent-policy-1': {
        id: 'agent-policy-1',
        name: 'Agent policy 1',
        namespace: 'default',
      },
    });
    expect(result?.current.kuery).toEqual(
      'status:online or (status:error or status:degraded) or status:orphaned or (status:updating or status:unenrolling or status:enrolling) or status:offline'
    );

    expect(result?.current.page).toEqual({ index: 0, size: 20 });
    expect(result?.current.pageSizeOptions).toEqual([5, 20, 50]);
  });

  it('sync querystring kuery with current search', async () => {
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useFetchAgentsData());

    await waitFor(() => expect(renderer.history.location.search).toEqual(''));

    // Set search
    await act(async () => {
      result.current.setSearch('active:true');
    });

    await waitFor(() => expect(renderer.history.location.search).toEqual('?kuery=active%3Atrue'));

    // Clear search
    await act(async () => {
      result.current.setSearch('');
    });

    await waitFor(() => expect(renderer.history.location.search).toEqual(''));
  });

  it('should update allTags when tags are fetched', async () => {
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useFetchAgentsData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.allTags).toEqual(['tag1', 'tag2']);
  });

  describe('allTags', () => {
    it('should be updated to empty array when all tags are removed', async () => {
      const { sendGetAgentTagsForRq } = jest.requireMock('../../../../hooks');

      sendGetAgentTagsForRq.mockResolvedValueOnce({ items: ['tag1'] });

      const renderer = createFleetTestRendererMock();
      const { result } = renderer.renderHook(() => useFetchAgentsData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.allTags).toEqual(['tag1']);

      // Simulate removing the last tag - server returns empty array
      sendGetAgentTagsForRq.mockResolvedValueOnce({ items: [] });

      await act(async () => {
        await result.current.fetchData({ refreshTags: true });
      });

      await waitFor(() => {
        expect(result.current.allTags).toEqual([]);
      });
    });

    it('should be updated when tags change from multiple to fewer', async () => {
      const { sendGetAgentTagsForRq } = jest.requireMock('../../../../hooks');

      sendGetAgentTagsForRq.mockResolvedValueOnce({ items: ['tag1', 'tag2', 'tag3'] });

      const renderer = createFleetTestRendererMock();
      const { result } = renderer.renderHook(() => useFetchAgentsData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.allTags).toEqual(['tag1', 'tag2', 'tag3']);

      // Remove one tag - server returns fewer tags
      sendGetAgentTagsForRq.mockResolvedValueOnce({ items: ['tag1', 'tag2'] });

      await act(async () => {
        await result.current.fetchData({ refreshTags: true });
      });

      await waitFor(() => {
        expect(result.current.allTags).toEqual(['tag1', 'tag2']);
      });
    });

    it('should not be updated when they have not changed', async () => {
      const { sendGetAgentTagsForRq } = jest.requireMock('../../../../hooks');

      sendGetAgentTagsForRq.mockResolvedValue({ items: ['tag1', 'tag2'] });

      const renderer = createFleetTestRendererMock();
      const { result } = renderer.renderHook(() => useFetchAgentsData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialTags = result.current.allTags;
      expect(initialTags).toEqual(['tag1', 'tag2']);

      await act(async () => {
        await result.current.fetchData({ refreshTags: true });
      });

      await waitFor(() => {
        // Tags should still be the same reference (no unnecessary state update)
        expect(result.current.allTags).toEqual(['tag1', 'tag2']);
      });
    });
  });
});
