/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '@kbn/maintenance-windows-plugin/common';
import { telemetryTaskRunner } from './task';
import {
  getTotalCountAggregations,
  getTotalCountInUse,
  getMWTelemetry,
} from './lib/get_telemetry_from_kibana';
import { getFailedAndUnrecognizedTasksPerDay } from './lib/get_telemetry_from_task_manager';
import { getTotalAlertsCountAggregations } from './lib/get_telemetry_from_alerts';
import {
  getExecutionsPerDayCount,
  getExecutionTimeoutsPerDayCount,
} from './lib/get_telemetry_from_event_log';
import { getBackfillTelemetryPerDay } from './lib/get_backfill_telemetry';
import { getGapAutoFillSchedulerTelemetryPerDay } from './lib/get_gap_auto_fill_scheduler_telemetry';

jest.mock('./lib/get_telemetry_from_kibana');
jest.mock('./lib/get_telemetry_from_task_manager');
jest.mock('./lib/get_telemetry_from_alerts');
jest.mock('./lib/get_telemetry_from_event_log');
jest.mock('./lib/get_backfill_telemetry');
jest.mock('./lib/get_gap_auto_fill_scheduler_telemetry');

const eventLogIndex = '.kibana-event-log';
const taskManagerIndex = '.kibana-task-manager';

const mwTelemetryResult = {
  hasErrors: false,
  count_mw_total: 0,
  count_mw_with_repeat_toggle_on: 0,
  count_mw_with_filter_alert_toggle_on: 0,
};

const runContext = { taskInstance: { state: {} } } as unknown as RunContext;

describe('telemetryTaskRunner', () => {
  let logger: MockedLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggerMock.create();

    (getTotalCountAggregations as jest.Mock).mockResolvedValue({ hasErrors: false });
    (getTotalCountInUse as jest.Mock).mockResolvedValue({ hasErrors: false });
    (getFailedAndUnrecognizedTasksPerDay as jest.Mock).mockResolvedValue({ hasErrors: false });
    (getTotalAlertsCountAggregations as jest.Mock).mockResolvedValue({ hasErrors: false });
    (getExecutionsPerDayCount as jest.Mock).mockResolvedValue({ hasErrors: false });
    (getExecutionTimeoutsPerDayCount as jest.Mock).mockResolvedValue({ hasErrors: false });
    (getBackfillTelemetryPerDay as jest.Mock).mockResolvedValue({ hasErrors: false });
    (getGapAutoFillSchedulerTelemetryPerDay as jest.Mock).mockResolvedValue({ hasErrors: false });
    (getMWTelemetry as jest.Mock).mockResolvedValue(mwTelemetryResult);
  });

  test('does not request the maintenance-window hidden type or fail when the maintenanceWindows plugin is disabled', async () => {
    // Regression test: a disabled `maintenanceWindows` plugin (e.g. the search_ai_lake
    // serverless tier) left the `maintenance-window` type unregistered and failed the task.
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreSetup.getStartServices = jest.fn().mockResolvedValue([coreStart, {}, {}]);

    const savedObjectsRepository = savedObjectsRepositoryMock.create();
    // Mirror production: requesting the unregistered hidden type throws.
    coreStart.savedObjects.createInternalRepository = jest.fn((includedHiddenTypes?: string[]) => {
      if (includedHiddenTypes?.includes(MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE)) {
        throw new Error("Missing mappings for saved objects types: 'maintenance-window'");
      }
      return savedObjectsRepository;
    });

    const runner = telemetryTaskRunner(
      logger,
      coreSetup,
      eventLogIndex,
      taskManagerIndex
    )(runContext);

    const result = await runner.run();

    expect(coreStart.savedObjects.createInternalRepository).not.toHaveBeenCalledWith([
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
    ]);
    expect(getMWTelemetry).toHaveBeenCalledWith({
      logger,
      savedObjectsClient: savedObjectsRepository,
      maintenanceWindowsEnabled: false,
    });
    expect(result.state.count_mw_total).toBe(0);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('requests the maintenance-window hidden type when the maintenanceWindows plugin is enabled', async () => {
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();

    const savedObjectsRepository = savedObjectsRepositoryMock.create();
    const maintenanceWindows = { getMaintenanceWindowClientWithoutAuth: jest.fn() };
    coreSetup.getStartServices = jest
      .fn()
      .mockResolvedValue([coreStart, { maintenanceWindows }, {}]);

    coreStart.savedObjects.createInternalRepository = jest
      .fn()
      .mockReturnValue(savedObjectsRepository);

    const runner = telemetryTaskRunner(
      logger,
      coreSetup,
      eventLogIndex,
      taskManagerIndex
    )(runContext);

    await runner.run();

    expect(coreStart.savedObjects.createInternalRepository).toHaveBeenCalledWith([
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
    ]);
    expect(getMWTelemetry).toHaveBeenCalledWith({
      logger,
      savedObjectsClient: savedObjectsRepository,
      maintenanceWindowsEnabled: true,
    });
  });
});
