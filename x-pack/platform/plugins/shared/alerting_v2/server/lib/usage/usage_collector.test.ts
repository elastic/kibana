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
          alerts_count: { _meta: { description: 'Total number of alert events.' }, type: 'long' },
          alerts_count_by_kind: {
            DYNAMIC_KEY: {
              _meta: { description: 'Number of alert events by status.' },
              type: 'long',
            },
          },
          alerts_count_by_source: {
            DYNAMIC_KEY: {
              _meta: { description: 'Number of alert events by source.' },
              type: 'long',
            },
          },
          alerts_count_by_type: {
            DYNAMIC_KEY: {
              _meta: { description: 'Number of alert events by type.' },
              type: 'long',
            },
          },
          alerts_episode_count: {
            _meta: { description: 'Number of unique alert episodes.' },
            type: 'long',
          },
          alerts_index_size_bytes: {
            _meta: { description: 'Size of the alert events data stream in bytes.' },
            type: 'long',
          },
          alerts_min_timestamp: {
            _meta: { description: 'Earliest alert event timestamp.' },
            type: 'date',
          },
          avg_grouping_fields_count: {
            _meta: { description: 'Average number of grouping fields per rule.' },
            type: 'float',
          },
          avg_pending_count: {
            _meta: {
              description: 'Average configured pending count across rules with state transitions.',
            },
            type: 'float',
          },
          avg_recovering_count: {
            _meta: {
              description:
                'Average configured recovering count across rules with state transitions.',
            },
            type: 'float',
          },
          count_by_kind: {
            DYNAMIC_KEY: { _meta: { description: 'Number of rules by kind.' }, type: 'long' },
          },
          count_by_lookback: {
            DYNAMIC_KEY: {
              _meta: { description: 'Number of rules by lookback duration.' },
              type: 'long',
            },
          },
          count_by_no_data_behavior: {
            DYNAMIC_KEY: {
              _meta: { description: 'Number of rules by no data behavior.' },
              type: 'long',
            },
          },
          count_by_no_data_timeframe: {
            DYNAMIC_KEY: {
              _meta: { description: 'Number of rules by no data timeframe.' },
              type: 'long',
            },
          },
          count_by_pending_timeframe: {
            DYNAMIC_KEY: {
              _meta: { description: 'Number of rules by pending timeframe.' },
              type: 'long',
            },
          },
          count_by_recovering_timeframe: {
            DYNAMIC_KEY: {
              _meta: { description: 'Number of rules by recovering timeframe.' },
              type: 'long',
            },
          },
          count_by_recovery_policy_type: {
            DYNAMIC_KEY: {
              _meta: { description: 'Number of rules by recovery policy type.' },
              type: 'long',
            },
          },
          count_by_schedule: {
            DYNAMIC_KEY: {
              _meta: { description: 'Number of rules by schedule interval.' },
              type: 'long',
            },
          },
          count_enabled: {
            _meta: { description: 'Number of enabled alerting v2 rules.' },
            type: 'long',
          },
          count_total: {
            _meta: { description: 'Total number of alerting v2 rules.' },
            type: 'long',
          },
          count_with_grouping: {
            _meta: { description: 'Number of rules with grouping enabled.' },
            type: 'long',
          },
          count_with_no_data: {
            _meta: { description: 'Number of rules with no data handling configured.' },
            type: 'long',
          },
          count_with_query_condition: {
            _meta: { description: 'Number of rules with a query condition.' },
            type: 'long',
          },
          count_with_recovery_policy: {
            _meta: { description: 'Number of rules with a recovery policy.' },
            type: 'long',
          },
          count_with_recovery_query_condition: {
            _meta: { description: 'Number of rules with a recovery query condition.' },
            type: 'long',
          },
          dispatcher_executions_count_24hr: {
            _meta: { description: 'Total dispatcher executions in the last 24 hours.' },
            type: 'long',
          },
          error_messages: { items: { type: 'keyword' }, type: 'array' },
          executions_count_24hr: {
            _meta: { description: 'Total rule executor executions in the last 24 hours.' },
            type: 'long',
          },
          executions_count_by_status_24hr: {
            DYNAMIC_KEY: {
              _meta: {
                description: 'Rule executor executions by outcome status in the last 24 hours.',
              },
              type: 'long',
            },
          },
          executions_delay_p50_ms: {
            _meta: { description: 'P50 schedule delay in milliseconds over the last 24 hours.' },
            type: 'float',
          },
          executions_delay_p75_ms: {
            _meta: { description: 'P75 schedule delay in milliseconds over the last 24 hours.' },
            type: 'float',
          },
          executions_delay_p95_ms: {
            _meta: { description: 'P95 schedule delay in milliseconds over the last 24 hours.' },
            type: 'float',
          },
          executions_delay_p99_ms: {
            _meta: { description: 'P99 schedule delay in milliseconds over the last 24 hours.' },
            type: 'float',
          },
          has_errors: {
            _meta: {
              description: 'Whether the telemetry task encountered errors during collection.',
            },
            type: 'boolean',
          },
          min_created_at: { _meta: { description: 'Earliest rule creation date.' }, type: 'date' },
          notification_policies_avg_group_by_fields_count: {
            _meta: { description: 'Average number of group by fields per notification policy.' },
            type: 'float',
          },
          notification_policies_count: {
            _meta: { description: 'Total number of notification policies.' },
            type: 'long',
          },
          notification_policies_count_by_throttle_interval: {
            DYNAMIC_KEY: {
              _meta: { description: 'Number of notification policies by throttle interval.' },
              type: 'long',
            },
          },
          notification_policies_count_with_group_by: {
            _meta: { description: 'Number of notification policies with group by.' },
            type: 'long',
          },
          notification_policies_count_with_matcher: {
            _meta: { description: 'Number of notification policies with a matcher.' },
            type: 'long',
          },
          notification_policies_unique_workflow_count: {
            _meta: {
              description: 'Number of unique workflows referenced by notification policies.',
            },
            type: 'long',
          },
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
