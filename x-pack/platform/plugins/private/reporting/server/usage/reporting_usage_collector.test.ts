/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import type { ReportingCore } from '..';
import { createMockReportingCore } from '../test_helpers';
import { registerReportingUsageCollector } from './reporting_usage_collector';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

const usageCollectionSetup = usageCollectionPluginMock.createSetupContract();
const taskManagerStart = taskManagerMock.createStart();

describe('Reporting Usage Collector', () => {
  let mockReporting: ReportingCore;

  beforeAll(async () => {
    mockReporting = await createMockReportingCore(createMockConfigSchema());
  });

  it('instantiates the collector object', () => {
    const registerCollectorSpy = jest.spyOn(usageCollectionSetup, 'registerCollector');
    registerReportingUsageCollector(
      mockReporting,
      new Promise(() => taskManagerStart),
      usageCollectionSetup
    );

    expect(registerCollectorSpy).toBeCalledTimes(1);
    expect(registerCollectorSpy).toBeCalledWith(
      expect.objectContaining({
        type: 'reporting',
        isReady: expect.any(Function),
        fetch: expect.any(Function),
        schema: {
          available: { type: 'boolean' },
          enabled: { type: 'boolean' },
          error_messages: { items: { type: 'text' }, type: 'array' },
          has_errors: { type: 'boolean' },
          number_of_enabled_scheduled_reports: { type: 'long' },
          number_of_enabled_scheduled_reports_by_type: {
            PNGV2: { type: 'long' },
            csv_searchsource: { type: 'long' },
            csv_v2: { type: 'long' },
            printable_pdf: { type: 'long' },
            printable_pdf_v2: { type: 'long' },
          },
          number_of_scheduled_reports: { type: 'long' },
          number_of_scheduled_reports_by_type: {
            PNGV2: { type: 'long' },
            csv_searchsource: { type: 'long' },
            csv_v2: { type: 'long' },
            printable_pdf: { type: 'long' },
            printable_pdf_v2: { type: 'long' },
          },
          number_of_scheduled_reports_with_notifications: { type: 'long' },
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
    const taskManagerPromise = new Promise<TaskManagerStartContract>((resolve) => {
      resolve(taskManagerStart);
    });
    registerReportingUsageCollector(
      mockReporting,
      taskManagerPromise,
      usageCollectionMock as UsageCollectionSetup
    );
    // @ts-ignore
    expect(await usageCollectionMock.makeUsageCollector.mock.calls[0][0].fetch()).toEqual(
      expect.objectContaining({
        has_errors: true,
        error_messages: ['error message'],
        available: true,
        enabled: true,
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
      number_of_scheduled_reports: 21,
      number_of_enabled_scheduled_reports: 33,
    };
    taskManagerStart.get.mockResolvedValue({
      id: '1',
      state: mockStats,
    } as unknown as ConcreteTaskInstance);

    const taskManagerPromise = new Promise<TaskManagerStartContract>((resolve) => {
      resolve(taskManagerStart);
    });
    registerReportingUsageCollector(
      mockReporting,
      taskManagerPromise,
      usageCollectionMock as UsageCollectionSetup
    );

    // @ts-ignore
    expect(await usageCollectionMock.makeUsageCollector.mock.calls[0][0].fetch()).toEqual({
      ...mockStats,
      available: true,
      enabled: true,
    });
  });
});
