/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { act, waitFor } from '@testing-library/react';

import { useStartServices } from '../../../../hooks';

import { ExperimentalFeaturesService } from '../../../../services';
import { createFleetTestRendererMock } from '../../../../../../mock';

import { FLEET_PAGE_SIZE_OPTIONS } from '../../../../constants';

import { useFetchAgentsData } from './use_fetch_agents_data';

vi.mock('../../../../../../services/experimental_features');
const mockedExperimentalFeaturesService = vi.mocked(ExperimentalFeaturesService);

const defaultState = vi.hoisted(() => ({
  search: '',
  selectedAgentPolicies: [],
  selectedStatus: ['healthy', 'unhealthy', 'orphaned', 'updating', 'offline'],
  selectedTags: [],
  showUpgradeable: false,
  sort: { field: 'enrolled_at', direction: 'desc' },
  page: { index: 0, size: 20 },
}));

vi.mock('./use_session_agent_list_state', () => {
  let currentMockState = { ...defaultState };

  const mockUseSessionAgentListState = vi.fn(() => {
    const mockUpdateTableState = vi.fn((updates: any) => {
      currentMockState = { ...currentMockState, ...updates };
    });

    return {
      ...currentMockState,
      updateTableState: mockUpdateTableState,
      onTableChange: vi.fn(),
      clearFilters: vi.fn(),
      resetToDefaults: vi.fn(),
    };
  });

  return {
    useSessionAgentListState: mockUseSessionAgentListState,
    getDefaultAgentListState: vi.fn(() => defaultState),
    defaultAgentListState: defaultState,
  };
});

vi.mock('../../../../hooks', async () => {
  const mocked = {
    ...(await vi.importActual('../../../../hooks')),
    sendGetAgentsForRq: vi.fn().mockResolvedValue({
      statusSummary: {},
      items: [
        {
          id: 'agent123',
          policy_id: 'agent-policy-1',
        },
      ],
      total: 5,
    }),
    sendGetAgentStatus: vi.fn().mockResolvedValue({
      data: {
        results: {
          inactive: 2,
        },
        totalInactive: 2,
      },
    }),
    sendBulkGetAgentPoliciesForRq: vi.fn().mockReturnValue({
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
    sendGetAgentPolicies: vi.fn().mockReturnValue({
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
    useGetAgentPolicies: vi.fn().mockReturnValue({
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
      resendRequest: vi.fn(),
    } as any),
    sendGetAgentTagsForRq: vi.fn().mockReturnValue({ items: ['tag1', 'tag2'] }),
    sendGetActionStatus: vi.fn().mockResolvedValue({ data: { items: [] } }),
    useStartServices: vi.fn().mockReturnValue({
      notifications: {
        toasts: {
          addError: vi.fn(),
        },
      },
      cloud: {},
      data: { dataViews: { getFieldsForWildcard: vi.fn() } },
    }),
  };
  return { ...mocked, default: mocked };
});

describe('useFetchAgentsData', () => {
  const startServices = useStartServices();
  const mockErrorToast = startServices.notifications.toasts.addError as Mock;

  beforeAll(() => {
    mockedExperimentalFeaturesService.get.mockReturnValue({} as any);
  });

  beforeEach(async () => {
    mockErrorToast.mockReset();
    mockErrorToast.mockResolvedValue({});
    const { sendGetAgentTagsForRq, sendGetActionStatus } = vi.mocked(
      await import('../../../../hooks')
    );
    sendGetAgentTagsForRq.mockReturnValue({ items: ['tag1', 'tag2'] });
    sendGetActionStatus.mockResolvedValue({ data: { items: [] } });
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
    expect(result?.current.pageSizeOptions).toEqual([...FLEET_PAGE_SIZE_OPTIONS]);
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
      const { sendGetAgentTagsForRq } = vi.mocked(await import('../../../../hooks'));

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
      const { sendGetAgentTagsForRq } = vi.mocked(await import('../../../../hooks'));

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
      const { sendGetAgentTagsForRq } = vi.mocked(await import('../../../../hooks'));

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

  describe('error action ids', () => {
    it('calls sendGetActionStatus with latest window and accumulates error action ids', async () => {
      const { sendGetActionStatus } = vi.mocked(await import('../../../../hooks'));
      sendGetActionStatus.mockImplementation((opts: { scheduledOnly?: boolean }) => {
        if (opts.scheduledOnly) return Promise.resolve({ data: { items: [] } });
        return Promise.resolve({
          data: {
            items: [
              { actionId: 'action-err-1', latestErrors: [{ error: 'oops' }] },
              { actionId: 'action-ok-1', latestErrors: [] },
            ],
          },
        });
      });

      const renderer = createFleetTestRendererMock();
      const { result } = renderer.renderHook(() => useFetchAgentsData());

      await waitFor(() => {
        expect(result.current.latestAgentActionErrors).toContain('action-err-1');
      });
      expect(result.current.latestAgentActionErrors).not.toContain('action-ok-1');

      const calls = sendGetActionStatus.mock.calls.filter(
        ([opts]: [{ scheduledOnly?: boolean }]) => !opts.scheduledOnly
      );
      expect(calls[0][0]).toMatchObject({ latest: expect.any(Number) });
    });
  });

  describe('scheduledActionsCount', () => {
    it('returns 0 when there are no scheduled UNENROLL actions', async () => {
      const { sendGetActionStatus } = vi.mocked(await import('../../../../hooks'));
      sendGetActionStatus.mockResolvedValue({ data: { items: [] } });

      const renderer = createFleetTestRendererMock();
      const { result } = renderer.renderHook(() => useFetchAgentsData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.scheduledActionsCount).toBe(0);
    });

    it('sums nbAgentsActioned for future UNENROLL actions', async () => {
      const futureTime = new Date(Date.now() + 3600_000).toISOString();
      const { sendGetActionStatus } = vi.mocked(await import('../../../../hooks'));
      sendGetActionStatus.mockImplementation(({ scheduledOnly }: { scheduledOnly?: boolean }) => {
        if (!scheduledOnly) return Promise.resolve({ data: { items: [] } });
        return Promise.resolve({
          data: {
            items: [
              {
                actionId: 'sched-1',
                type: 'UNENROLL',
                status: 'IN_PROGRESS',
                startTime: futureTime,
                nbAgentsActioned: 5,
              },
              {
                actionId: 'sched-2',
                type: 'UNENROLL',
                status: 'IN_PROGRESS',
                startTime: futureTime,
                nbAgentsActioned: 3,
              },
            ],
          },
        });
      });

      const renderer = createFleetTestRendererMock();
      const { result } = renderer.renderHook(() => useFetchAgentsData());

      await waitFor(() => {
        expect(result.current.scheduledActionsCount).toBe(8);
      });
    });

    it('excludes non-UNENROLL scheduled actions', async () => {
      const futureTime = new Date(Date.now() + 3600_000).toISOString();
      const { sendGetActionStatus } = vi.mocked(await import('../../../../hooks'));
      sendGetActionStatus.mockImplementation(({ scheduledOnly }: { scheduledOnly?: boolean }) => {
        if (!scheduledOnly) return Promise.resolve({ data: { items: [] } });
        return Promise.resolve({
          data: {
            items: [
              {
                actionId: 'sched-upgrade',
                type: 'UPGRADE',
                status: 'IN_PROGRESS',
                startTime: futureTime,
                nbAgentsActioned: 10,
              },
              {
                actionId: 'sched-unenroll',
                type: 'UNENROLL',
                status: 'IN_PROGRESS',
                startTime: futureTime,
                nbAgentsActioned: 4,
              },
            ],
          },
        });
      });

      const renderer = createFleetTestRendererMock();
      const { result } = renderer.renderHook(() => useFetchAgentsData());

      await waitFor(() => {
        expect(result.current.scheduledActionsCount).toBe(4);
      });
    });

    it('calls sendGetActionStatus with scheduledOnly: true', async () => {
      const { sendGetActionStatus } = vi.mocked(await import('../../../../hooks'));
      sendGetActionStatus.mockResolvedValue({ data: { items: [] } });

      const renderer = createFleetTestRendererMock();
      renderer.renderHook(() => useFetchAgentsData());

      await waitFor(() => {
        const scheduledCall = sendGetActionStatus.mock.calls.find(
          ([opts]: [{ scheduledOnly?: boolean }]) => opts.scheduledOnly === true
        );
        expect(scheduledCall).toBeDefined();
        expect(scheduledCall[0]).not.toHaveProperty('latest');
      });
    });
  });
});
