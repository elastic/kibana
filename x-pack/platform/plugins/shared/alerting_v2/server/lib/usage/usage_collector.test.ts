/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { registerAlertingV2UsageCollector } from './usage_collector';

const usageCollectionSetup = usageCollectionPluginMock.createSetupContract();
const taskManagerStart = taskManagerMock.createStart();

beforeEach(() => jest.resetAllMocks());

describe('registerAlertingV2UsageCollector', () => {
  it('instantiates the collector object', () => {
    const registerCollectorSpy = jest.spyOn(usageCollectionSetup, 'registerCollector');
    registerAlertingV2UsageCollector(() => taskManagerStart, usageCollectionSetup);

    expect(registerCollectorSpy).toHaveBeenCalledTimes(1);
    expect(registerCollectorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'alerting_v2',
        isReady: expect.any(Function),
        fetch: expect.any(Function),
        schema: {
          has_errors: { type: 'boolean' },
          error_messages: { type: 'array', items: { type: 'keyword' } },
          count_total: { type: 'long' },
          count_enabled: { type: 'long' },
          count_by_kind: { DYNAMIC_KEY: { type: 'long' } },
          count_by_schedule: { DYNAMIC_KEY: { type: 'long' } },
          count_by_lookback: { DYNAMIC_KEY: { type: 'long' } },
          count_with_query_condition: { type: 'long' },
          count_with_recovery_policy: { type: 'long' },
          count_by_recovery_policy_type: { DYNAMIC_KEY: { type: 'long' } },
          count_with_recovery_query_condition: { type: 'long' },
          count_by_pending_timeframe: { DYNAMIC_KEY: { type: 'long' } },
          count_by_recovering_timeframe: { DYNAMIC_KEY: { type: 'long' } },
          count_with_grouping: { type: 'long' },
          avg_grouping_fields_count: { type: 'float' },
          count_with_no_data: { type: 'long' },
          count_by_no_data_behavior: { DYNAMIC_KEY: { type: 'long' } },
          count_by_no_data_timeframe: { DYNAMIC_KEY: { type: 'long' } },
          count_notification_policies: { type: 'long' },
          min_created_at: { type: 'date' },
          notification_policies_count: { type: 'long' },
          notification_policies_unique_workflow_count: { type: 'long' },
          notification_policies_count_with_matcher: { type: 'long' },
          notification_policies_count_with_group_by: { type: 'long' },
          notification_policies_avg_group_by_fields_count: { type: 'float' },
          notification_policies_count_by_throttle_interval: { DYNAMIC_KEY: { type: 'long' } },
          alerts_count: { type: 'long' },
          alerts_count_by_kind: { DYNAMIC_KEY: { type: 'long' } },
          alerts_count_by_source: { DYNAMIC_KEY: { type: 'long' } },
          alerts_count_by_type: { DYNAMIC_KEY: { type: 'long' } },
          alerts_episode_count: { type: 'long' },
          alerts_min_timestamp: { type: 'date' },
          alerts_index_size_bytes: { type: 'long' },
        },
      })
    );
  });

  it('should return an error message if fetching data fails', async () => {
    const usageCollectionMock = {
      makeUsageCollector: jest.fn(),
      registerCollector: jest.fn(),
    } as unknown as jest.Mocked<UsageCollectionSetup>;
    taskManagerStart.get.mockRejectedValueOnce(new Error('error message'));

    registerAlertingV2UsageCollector(
      () => taskManagerStart,
      usageCollectionMock as UsageCollectionSetup
    );
    // @ts-ignore
    expect(await usageCollectionMock.makeUsageCollector.mock.calls[0][0].fetch()).toEqual(
      expect.objectContaining({
        has_errors: true,
        error_messages: ['error message'],
      })
    );
  });

  it('should return the task state with runs stripped out', async () => {
    const usageCollectionMock = {
      makeUsageCollector: jest.fn(),
      registerCollector: jest.fn(),
    } as unknown as jest.Mocked<UsageCollectionSetup>;
    const mockStats = {
      has_errors: false,
      error_messages: undefined,
      runs: 5,
      count_total: 20,
      count_enabled: 15,
      count_by_kind: { metric: 12, log: 8 },
      alerts_count: 100,
    };
    taskManagerStart.get.mockResolvedValue({
      id: '1',
      state: mockStats,
    } as unknown as ConcreteTaskInstance);

    registerAlertingV2UsageCollector(
      () => taskManagerStart,
      usageCollectionMock as UsageCollectionSetup
    );

    // @ts-ignore
    const result = await usageCollectionMock.makeUsageCollector.mock.calls[0][0].fetch();
    expect(result).toEqual({
      has_errors: false,
      error_messages: undefined,
      count_total: 20,
      count_enabled: 15,
      count_by_kind: { metric: 12, log: 8 },
      alerts_count: 100,
    });
    expect(result).not.toHaveProperty('runs');
  });

  it('should not throw NotInitialized errors from task manager', async () => {
    const usageCollectionMock = {
      makeUsageCollector: jest.fn(),
      registerCollector: jest.fn(),
    } as unknown as jest.Mocked<UsageCollectionSetup>;
    taskManagerStart.get.mockRejectedValueOnce(new Error('NotInitialized'));

    registerAlertingV2UsageCollector(
      () => taskManagerStart,
      usageCollectionMock as UsageCollectionSetup
    );

    // @ts-ignore
    const result = await usageCollectionMock.makeUsageCollector.mock.calls[0][0].fetch();
    expect(result).toEqual(
      expect.objectContaining({
        has_errors: true,
      })
    );
  });

  it('should return the task state including error messages', async () => {
    const usageCollectionMock = {
      makeUsageCollector: jest.fn(),
      registerCollector: jest.fn(),
    } as unknown as jest.Mocked<UsageCollectionSetup>;
    const mockStats = {
      has_errors: true,
      error_messages: ['an error message'],
      runs: 3,
      count_total: 10,
    };
    taskManagerStart.get.mockResolvedValue({
      id: '1',
      state: mockStats,
    } as unknown as ConcreteTaskInstance);

    registerAlertingV2UsageCollector(
      () => taskManagerStart,
      usageCollectionMock as UsageCollectionSetup
    );

    // @ts-ignore
    expect(await usageCollectionMock.makeUsageCollector.mock.calls[0][0].fetch()).toEqual({
      has_errors: true,
      error_messages: ['an error message'],
      count_total: 10,
    });
  });
});
