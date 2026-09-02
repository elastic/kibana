/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  RunQuotaHeartbeatAttributes,
  RunQuotaLedgerAttributes,
  RunQuotaSettingsAttributes,
} from './saved_objects';
import {
  getRunQuotaHeartbeatId,
  getRunQuotaLedgerId,
  mutateRunQuotaLedger,
  mutateRunQuotaSettings,
  updateRunQuotaHeartbeatMaxTimestamp,
  type RunQuotaSavedObjectsRepository,
} from './repository';

const makeSavedObject = <T extends Record<string, unknown>>(
  type: string,
  id: string,
  attributes: T,
  version = 'WzEsMV0='
) => ({
  type,
  id,
  attributes,
  references: [],
  version,
});

const makeRepository = (): jest.Mocked<RunQuotaSavedObjectsRepository> =>
  ({
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<RunQuotaSavedObjectsRepository>);

describe('run quota OCC repository', () => {
  it('preserves unknown settings fields and budget groups across conflict retries', async () => {
    const repository = makeRepository();
    const first: RunQuotaSettingsAttributes = {
      timezone: 'UTC',
      enforcementEnabled: false,
      limits: {
        detection: { enabled: true, max: 100 },
        future_group: { enabled: true, max: 9 },
      },
      futureTopLevel: { retained: 'first' },
    };
    const winner: RunQuotaSettingsAttributes = {
      ...first,
      limits: {
        ...first.limits,
        investigation: { enabled: true, max: 40 },
      },
      futureTopLevel: { retained: 'winner' },
    };
    repository.get
      .mockResolvedValueOnce(makeSavedObject('settings', 'settings', first))
      .mockResolvedValueOnce(makeSavedObject('settings', 'settings', winner, 'WzIsMV0='));
    repository.update
      .mockRejectedValueOnce(SavedObjectsErrorHelpers.createConflictError('settings', 'settings'))
      .mockImplementation(async (_type, _id, attributes) =>
        makeSavedObject('settings', 'settings', attributes, 'WzMsMV0=')
      );

    const result = await mutateRunQuotaSettings(repository, () => ({
      limits: { detection: { enabled: true, max: 120 } },
    }));

    expect(result).toEqual(
      expect.objectContaining({
        futureTopLevel: { retained: 'winner' },
        limits: {
          detection: { enabled: true, max: 120 },
          investigation: { enabled: true, max: 40 },
          ki_extraction: { enabled: true, max: 20 },
          memory: { enabled: false, max: 0 },
          future_group: { enabled: true, max: 9 },
        },
      })
    );
  });

  it('preserves unknown ledger fields during an OCC mutation', async () => {
    const repository = makeRepository();
    const current: RunQuotaLedgerAttributes = {
      date: '2026-08-31',
      group: 'detection',
      count: 1,
      withinLimitGrantCount: 0,
      criticalPastLimitGrantCount: 0,
      consumedGrantKeys: ['grant-1'],
      decisions: [],
      skipped: [],
      totalSkipped: 0,
      decisionsEvicted: false,
      futureTopLevel: { retained: true },
    };
    repository.get.mockResolvedValue(
      makeSavedObject('ledger', getRunQuotaLedgerId('2026-08-31', 'detection'), current)
    );
    repository.update.mockImplementation(async (_type, id, attributes) =>
      makeSavedObject('ledger', id, attributes)
    );

    const result = await mutateRunQuotaLedger({
      internalRepository: repository,
      date: '2026-08-31',
      group: 'detection',
      mutation: (ledger) => ({
        count: ledger.count + 1,
        consumedGrantKeys: [...ledger.consumedGrantKeys, 'grant-2'],
      }),
    });

    expect(result.futureTopLevel).toEqual({ retained: true });
    expect(result.count).toBe(2);
    expect(result.consumedGrantKeys).toEqual(['grant-1', 'grant-2']);
  });

  it('preserves unknown heartbeat fields and keeps the newest timestamp', async () => {
    const repository = makeRepository();
    const current: RunQuotaHeartbeatAttributes = {
      group: 'detection',
      spaceId: 'default',
      driverExecutionId: 'old-execution',
      recordedAt: '2026-08-31T11:00:00.000Z',
      monitoringEnabled: true,
      scheduleGeneration: 2,
      scheduleGenerationChangedAt: '2026-08-31T10:00:00.000Z',
      futureTopLevel: { retained: true },
    };
    repository.get.mockResolvedValue(
      makeSavedObject('heartbeat', getRunQuotaHeartbeatId('detection', 'default'), current)
    );
    repository.update.mockImplementation(async (_type, id, attributes) =>
      makeSavedObject('heartbeat', id, attributes)
    );

    const result = await updateRunQuotaHeartbeatMaxTimestamp({
      internalRepository: repository,
      group: 'detection',
      spaceId: 'default',
      driverExecutionId: 'new-execution',
      recordedAt: '2026-08-31T12:00:00.000Z',
    });

    expect(result.recorded).toBe(true);
    expect(result.attributes).toEqual(
      expect.objectContaining({
        driverExecutionId: 'new-execution',
        recordedAt: '2026-08-31T12:00:00.000Z',
        scheduleGeneration: 2,
        futureTopLevel: { retained: true },
      })
    );
  });

  it('does not replace a heartbeat with an older scheduled occurrence', async () => {
    const repository = makeRepository();
    const current: RunQuotaHeartbeatAttributes = {
      group: 'ki_extraction',
      spaceId: 'default',
      driverExecutionId: 'newer-execution',
      recordedAt: '2026-08-31T12:00:00.000Z',
      monitoringEnabled: false,
      scheduleGeneration: 0,
      scheduleGenerationChangedAt: '2026-08-31T10:00:00.000Z',
    };
    repository.get.mockResolvedValue(
      makeSavedObject('heartbeat', getRunQuotaHeartbeatId('ki_extraction', 'default'), current)
    );
    repository.update.mockImplementation(async (_type, id, attributes) =>
      makeSavedObject('heartbeat', id, attributes)
    );

    const result = await updateRunQuotaHeartbeatMaxTimestamp({
      internalRepository: repository,
      group: 'ki_extraction',
      spaceId: 'default',
      driverExecutionId: 'older-execution',
      recordedAt: '2026-08-31T11:00:00.000Z',
    });

    expect(result.recorded).toBe(false);
    expect(result.attributes.driverExecutionId).toBe('newer-execution');
    expect(result.attributes.recordedAt).toBe('2026-08-31T12:00:00.000Z');
  });

  it('uses unambiguous deterministic ids', () => {
    expect(getRunQuotaLedgerId('2026-08-31', 'detection')).toBe('2026-08-31-detection');
    expect(getRunQuotaHeartbeatId('detection', 'ab')).not.toBe(
      getRunQuotaHeartbeatId('detection', 'a-b')
    );
  });
});
