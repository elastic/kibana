/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable ban/ban */


import { act, waitFor } from '@testing-library/react';

import { useStartServices } from '../../../../hooks';

import { ExperimentalFeaturesService } from '../../../../services';
import { createFleetTestRendererMock } from '../../../../../../mock';

import { useFetchAgentsData } from './use_fetch_agents_data';

jest.mock('../../../../../../services/experimental_features');
const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  sendGetAgents: jest.fn().mockResolvedValue({
    data: {
      statusSummary: {},
      items: [
        {
          id: 'agent123',
          policy_id: 'agent-policy-1',
        },
      ],
      total: 5,
    },
  }),
  sendGetAgentStatus: jest.fn().mockResolvedValue({
    data: {
      results: {
        inactive: 2,
      },
      totalInactive: 2,
    },
  }),
  sendBulkGetAgentPolicies: jest.fn().mockReturnValue({
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
  sendGetAgentTags: jest.fn().mockReturnValue({ data: { items: ['tag1', 'tag2'] } }),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addError: jest.fn(),
      },
    },
    cloud: {},
    data: { dataViews: { getFieldsForWildcard: jest.fn() } },
  }),
  usePagination: jest.fn().mockReturnValue({
    pagination: {
      currentPage: 1,
      pageSize: 5,
    },
    pageSizeOptions: [5, 20, 50],
    setPagination: jest.fn(),
  }),
}));

function blocked(fn: any) {
  let start = process.hrtime();
  const interval = 50;
  const threshold = 1000;

  return setInterval(function () {
    const delta = process.hrtime(start);
    const nanosec = delta[0] * 1e9 + delta[1];
    const ms = nanosec / 1e6;
    const n = ms - interval;

    if (n > threshold) {
      fn(Math.round(n));
    }
    start = process.hrtime();
  }, interval);
}

describe('Attempt to reproduce test flakiness', () => {
  for (let i = 0; i < 5000; i++) {
    describe(`useFetchAgentsData - ${i + 1}`, () => {
      let interval: any;
      beforeAll(() => {
        interval = blocked((ms: number) => {
          process.stdout.write(`\nevent loop delay ${ms}\n`);
        });
      });
      afterAll(() => {
        clearInterval(interval);
      });
      const startServices = useStartServices();
      const mockErrorToast = startServices.notifications.toasts.addError as jest.Mock;
      beforeAll(() => {
        mockedExperimentalFeaturesService.get.mockReturnValue({
          displayAgentMetrics: true,
        } as any);
      });

      beforeEach(() => {
        mockErrorToast.mockReset();
        mockErrorToast.mockResolvedValue({});
      });

      it('should fetch agents and agent policies data', async () => {
        const renderer = createFleetTestRendererMock();
        const { result } = renderer.renderHook(() => useFetchAgentsData());
        await waitFor(() => new Promise((resolve) => resolve(null)));
        expect(result?.current.selectedStatus).toEqual([
          'healthy',
          'unhealthy',
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
          'status:online or (status:error or status:degraded) or (status:updating or status:unenrolling or status:enrolling) or status:offline'
        );
        expect(result?.current.currentRequestRef).toEqual({ current: 2 });
        expect(result?.current.pagination).toEqual({ currentPage: 1, pageSize: 5 });
        expect(result?.current.pageSizeOptions).toEqual([5, 20, 50]);
      });

      it('sync querystring kuery with current search', async () => {
        process.stdout.write(`\niteration ${i + 1}\n`);
        let start = Date.now();

        const renderer = createFleetTestRendererMock();
        const { result } = renderer.renderHook(() => useFetchAgentsData());
        process.stdout.write(`\n initial render ${Date.now() - start}ms \n`);

        start = Date.now();
        await waitFor(() => expect(renderer.history.location.search).toEqual(''));
        process.stdout.write(`\n empty search ${Date.now() - start}ms \n`);

        // Set search
        start = Date.now();
        await act(async () => {
          result.current.setSearch('active:true');
        });
        process.stdout.write(`\n set search to active: true ${Date.now() - start}ms \n`);

        start = Date.now();
        await waitFor(() =>
          expect(renderer.history.location.search).toEqual('?kuery=active%3Atrue')
        );
        process.stdout.write(`\n check query params ${Date.now() - start}ms \n`);

        // Clear search
        start = Date.now();
        await act(async () => {
          result.current.setSearch('');
        });
        process.stdout.write(`\n clear search ${Date.now() - start}ms \n`);

        start = Date.now();
        await waitFor(() => expect(renderer.history.location.search).toEqual(''));
        process.stdout.write(`\n reset query params ${Date.now() - start}ms \n`);
      });
    });
  }
});
