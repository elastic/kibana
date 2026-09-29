/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { registerAlertingUsageCollector } from './alerting_usage_collector';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
const taskManagerStart = taskManagerMock.createStart();

beforeEach(() => vi.resetAllMocks());

describe('registerAlertingUsageCollector', () => {
  let usageCollectionMock: Mocked<UsageCollectionSetup>;

  beforeEach(() => {
    usageCollectionMock = {
      makeUsageCollector: vi.fn(),
      registerCollector: vi.fn(),
    } as unknown as Mocked<UsageCollectionSetup>;
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
});
