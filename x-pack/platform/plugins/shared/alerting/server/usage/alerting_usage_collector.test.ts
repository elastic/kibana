/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { RuleExecutionStatusErrorReasons } from '../../common';
import {
  NUM_ALERTING_EXECUTION_FAILURE_REASON_TYPES,
  registerAlertingUsageCollector,
} from './alerting_usage_collector';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
const taskManagerStart = taskManagerMock.createStart();

beforeEach(() => jest.resetAllMocks());

describe('registerAlertingUsageCollector', () => {
  let usageCollectionMock: jest.Mocked<UsageCollectionSetup>;

  beforeEach(() => {
    usageCollectionMock = {
      makeUsageCollector: jest.fn(),
      registerCollector: jest.fn(),
    } as unknown as jest.Mocked<UsageCollectionSetup>;
  });

  it('should call registerCollector', () => {
    registerAlertingUsageCollector(
      usageCollectionMock as UsageCollectionSetup,
      new Promise(() => taskManagerStart)
    );
    expect(usageCollectionMock.registerCollector).toHaveBeenCalledTimes(1);
  });

  it('should call makeUsageCollector with type = alerts', () => {
    registerAlertingUsageCollector(
      usageCollectionMock as UsageCollectionSetup,
      new Promise(() => taskManagerStart)
    );
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalledTimes(1);
    expect(usageCollectionMock.makeUsageCollector.mock.calls[0][0].type).toBe('alerts');
  });

  it('should return an error message if fetching data fails', async () => {
    taskManagerStart.get.mockRejectedValueOnce(new Error('error message'));
    const taskManagerPromise = new Promise<TaskManagerStartContract>((resolve) => {
      resolve(taskManagerStart);
    });
    registerAlertingUsageCollector(usageCollectionMock as UsageCollectionSetup, taskManagerPromise);
    // @ts-ignore
    expect(await usageCollectionMock.makeUsageCollector.mock.calls[0][0].fetch()).toEqual(
      expect.objectContaining({
        has_errors: true,
        error_messages: ['error message'],
      })
    );
  });

  it('should return the task state including error messages', async () => {
    const mockStats = {
      has_errors: true,
      error_messages: ['an error message'],
      count_active_total: 1,
      count_disabled_total: 10,
    };
    taskManagerStart.get.mockResolvedValue({
      id: '1',
      state: mockStats,
    } as unknown as ConcreteTaskInstance);

    const taskManagerPromise = new Promise<TaskManagerStartContract>((resolve) => {
      resolve(taskManagerStart);
    });
    registerAlertingUsageCollector(usageCollectionMock as UsageCollectionSetup, taskManagerPromise);
    // @ts-ignore
    expect(await usageCollectionMock.makeUsageCollector.mock.calls[0][0].fetch()).toEqual(
      mockStats
    );
  });

  it('declares every execution failure reason and excludes the schema placeholder from the agg size', () => {
    registerAlertingUsageCollector(
      usageCollectionMock as UsageCollectionSetup,
      new Promise(() => taskManagerStart)
    );
    const collector = usageCollectionMock.makeUsageCollector.mock.calls[0][0] as {
      schema: {
        count_rules_executions_failured_by_reason_per_day: Record<string, unknown>;
        count_rules_executions_failured_by_reason_by_type_per_day: Record<string, unknown>;
      };
    };
    const reasons = Object.values(RuleExecutionStatusErrorReasons);
    expect(NUM_ALERTING_EXECUTION_FAILURE_REASON_TYPES).toBe(reasons.length);

    for (const reasonSchema of [
      collector.schema.count_rules_executions_failured_by_reason_per_day,
      collector.schema.count_rules_executions_failured_by_reason_by_type_per_day,
    ]) {
      expect(
        Object.keys(reasonSchema)
          .filter((key) => key !== 'DYNAMIC_KEY')
          .sort()
      ).toEqual([...reasons].sort());
    }
  });
});
