/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES,
} from '@kbn/management-settings-ids';
import {
  createRunQuotaHousekeepingProductionDependencies,
  ensureRunQuotaHousekeepingScheduled,
  registerRunQuotaHousekeepingTask,
  RUN_QUOTA_HOUSEKEEPING_INTERVAL,
  RUN_QUOTA_HOUSEKEEPING_TASK_ID,
  RUN_QUOTA_HOUSEKEEPING_TASK_TYPE,
  runRunQuotaHousekeeping,
} from './housekeeping';
import { createInMemoryRunQuotaRepository } from './in_memory_repository.test_utils';
import { readRunQuotaSettings } from './repository';
import { RUN_QUOTA_LEDGER_SO_TYPE, RUN_QUOTA_WORKER_DECISION_SO_TYPE } from './saved_objects';

const noTargets = {
  getDetectionTargets: jest.fn().mockResolvedValue({ targets: [], unavailable: false }),
  getKiTarget: jest.fn().mockResolvedValue({
    targets: { enabled: false },
    unavailable: false,
  }),
  getMaintenancePaused: jest.fn().mockResolvedValue({
    targets: false,
    unavailable: false,
  }),
};

describe('run quota housekeeping', () => {
  it('deletes expired documents and advances completion and retention stamps', async () => {
    const repository = createInMemoryRunQuotaRepository();
    repository.seed(RUN_QUOTA_LEDGER_SO_TYPE, 'old-ledger', {
      date: '2026-08-20',
    });
    repository.seed(RUN_QUOTA_WORKER_DECISION_SO_TYPE, 'old-decision', {
      ledgerDate: '2026-08-20',
    });
    repository.seed(RUN_QUOTA_LEDGER_SO_TYPE, 'current-ledger', {
      date: '2026-08-31',
    });

    await expect(
      runRunQuotaHousekeeping({
        internalRepository: repository.client as never,
        ...noTargets,
        logger: loggingSystemMock.createLogger(),
        now: new Date('2026-08-31T12:00:00.000Z'),
      })
    ).resolves.toEqual({ completed: true });

    expect(repository.getAttributes(RUN_QUOTA_LEDGER_SO_TYPE, 'old-ledger')).toBeUndefined();
    expect(
      repository.getAttributes(RUN_QUOTA_WORKER_DECISION_SO_TYPE, 'old-decision')
    ).toBeUndefined();
    expect(repository.getAttributes(RUN_QUOTA_LEDGER_SO_TYPE, 'current-ledger')).toBeDefined();
    expect(await readRunQuotaSettings(repository.client)).toEqual(
      expect.objectContaining({
        lastAttemptedAt: '2026-08-31T12:00:00.000Z',
        lastHousekeepingAt: '2026-08-31T12:00:00.000Z',
        retentionWatermark: '2026-08-24',
      })
    );
  });

  it('does not stamp completion or the watermark after a bounded partial sweep', async () => {
    const repository = createInMemoryRunQuotaRepository();
    const expiredSavedObject = {
      type: RUN_QUOTA_LEDGER_SO_TYPE,
      id: 'never-drained',
      attributes: { date: '2026-08-20' },
      references: [],
      score: 0,
    };
    const internalRepository = {
      ...repository.client,
      find: jest.fn().mockResolvedValue({
        page: 1,
        per_page: 100,
        total: 1,
        saved_objects: [expiredSavedObject],
      }),
      delete: jest.fn().mockResolvedValue({}),
    };

    await expect(
      runRunQuotaHousekeeping({
        internalRepository: internalRepository as never,
        ...noTargets,
        logger: loggingSystemMock.createLogger(),
        now: new Date('2026-08-31T12:00:00.000Z'),
      })
    ).resolves.toEqual({ completed: false });

    const settings = await readRunQuotaSettings(repository.client);
    expect(settings.lastAttemptedAt).toBe('2026-08-31T12:00:00.000Z');
    expect(settings.lastHousekeepingAt).toBeUndefined();
    expect(settings.retentionWatermark).toBeUndefined();
    expect(internalRepository.find).toHaveBeenCalledTimes(20);
  });

  it('persists unknown health without stamping a failed target-collection pass complete', async () => {
    const repository = createInMemoryRunQuotaRepository();

    await runRunQuotaHousekeeping({
      internalRepository: repository.client as never,
      getDetectionTargets: jest.fn().mockResolvedValue({
        targets: [],
        unavailable: true,
      }),
      getKiTarget: noTargets.getKiTarget,
      getMaintenancePaused: noTargets.getMaintenancePaused,
      logger: loggingSystemMock.createLogger(),
      now: new Date('2026-08-31T12:00:00.000Z'),
    });

    const settings = await readRunQuotaSettings(repository.client);
    expect(settings.driverHealth?.detection.status).toBe('unknown');
    expect(settings.lastHousekeepingAt).toBeUndefined();
  });

  it('includes hidden spaces when collecting detection reachability targets', async () => {
    const find = jest.fn().mockResolvedValue({
      saved_objects: [{ id: 'space-a' }],
      total: 1,
    });
    const asScopedToNamespace = jest.fn((spaceId: string) => ({ spaceId }));
    const getUnsafeInternalClient = jest.fn().mockReturnValue({
      find,
      asScopedToNamespace,
    });
    const get = jest.fn((settingId: string) => {
      if (settingId === OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED) {
        return Promise.resolve(true);
      }
      if (
        settingId ===
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES
      ) {
        return Promise.resolve(15);
      }
      throw new Error(`Unexpected setting ${settingId}`);
    });
    const asScopedToClient = jest.fn().mockReturnValue({ get });
    const getWorkflow = jest.fn().mockResolvedValue({
      lastUpdatedAt: '2026-08-31T10:00:00.000Z',
    });

    const dependencies = await createRunQuotaHousekeepingProductionDependencies({
      coreStart: {
        savedObjects: { getUnsafeInternalClient },
        uiSettings: { asScopedToClient },
      } as never,
      server: {
        core: {
          savedObjects: {
            createInternalRepository: jest.fn().mockReturnValue({}),
          },
        },
        workflowsManagement: { management: { getWorkflow } },
      } as never,
      logger: loggingSystemMock.createLogger(),
      signal: new AbortController().signal,
    });

    await expect(dependencies.getDetectionTargets()).resolves.toEqual({
      targets: [
        {
          spaceId: 'default',
          enabled: true,
          reviewIntervalMinutes: 15,
          driverUpdatedAt: '2026-08-31T10:00:00.000Z',
        },
        {
          spaceId: 'space-a',
          enabled: true,
          reviewIntervalMinutes: 15,
          driverUpdatedAt: '2026-08-31T10:00:00.000Z',
        },
      ],
      unavailable: false,
    });
    expect(getUnsafeInternalClient).toHaveBeenCalledWith({
      includedHiddenTypes: ['space'],
    });
    expect(find).toHaveBeenCalledWith({
      type: 'space',
      page: 1,
      perPage: 1000,
    });
    expect(asScopedToNamespace).toHaveBeenCalledWith('default');
    expect(asScopedToNamespace).toHaveBeenCalledWith('space-a');
  });

  it('registers an explicitly bounded, single-attempt task with versioned state', () => {
    const registerTaskDefinitions = jest.fn();

    registerRunQuotaHousekeepingTask({
      taskManager: { registerTaskDefinitions } as never,
      core: {} as never,
      getServer: jest.fn(),
      logger: loggingSystemMock.createLogger(),
    });

    expect(registerTaskDefinitions).toHaveBeenCalledWith({
      [RUN_QUOTA_HOUSEKEEPING_TASK_TYPE]: expect.objectContaining({
        timeout: '2m',
        maxAttempts: 1,
        cost: expect.any(Number),
        priority: expect.any(Number),
        stateSchemaByVersion: { 1: expect.any(Object) },
        createTaskRunner: expect.any(Function),
      }),
    });
  });

  it('ensures one fixed deployment-wide five-minute schedule', async () => {
    const ensureScheduled = jest.fn().mockResolvedValue(undefined);

    await ensureRunQuotaHousekeepingScheduled({ ensureScheduled } as never);

    expect(ensureScheduled).toHaveBeenCalledWith({
      id: RUN_QUOTA_HOUSEKEEPING_TASK_ID,
      taskType: RUN_QUOTA_HOUSEKEEPING_TASK_TYPE,
      schedule: { interval: RUN_QUOTA_HOUSEKEEPING_INTERVAL },
      params: {},
      state: {},
    });
  });
});
