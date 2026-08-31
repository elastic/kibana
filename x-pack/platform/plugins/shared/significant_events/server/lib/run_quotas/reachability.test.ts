/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInMemoryRunQuotaRepository } from './in_memory_repository.test_utils';
import { computeRunQuotaDriverHealth } from './reachability';
import {
  mutateRunQuotaSettings,
  readRunQuotaSettings,
  updateRunQuotaHeartbeatMaxTimestamp,
} from './repository';
import { recordRunQuotaScheduleTransition } from './transitions';

const enableRunQuotas = async (
  repository: ReturnType<typeof createInMemoryRunQuotaRepository>,
  changedAt: string
) => {
  await mutateRunQuotaSettings(repository.client, () => ({
    enforcementEnabled: true,
    applicability: {
      global: { generation: 1, changedAt },
      groups: {
        detection: { generation: 1, changedAt },
        ki_extraction: { generation: 1, changedAt },
      },
    },
  }));
  return readRunQuotaSettings(repository.client);
};

const heartbeat = async ({
  repository,
  spaceId,
  recordedAt,
}: {
  repository: ReturnType<typeof createInMemoryRunQuotaRepository>;
  spaceId: string;
  recordedAt: string;
}) =>
  updateRunQuotaHeartbeatMaxTimestamp({
    internalRepository: repository.client,
    group: 'detection',
    spaceId,
    driverExecutionId: `execution-${spaceId}`,
    recordedAt,
  });

describe('run quota driver reachability', () => {
  it('uses degraded then unknown precedence across detection spaces', async () => {
    const repository = createInMemoryRunQuotaRepository();
    const settings = await enableRunQuotas(repository, '2026-08-31T07:00:00.000Z');
    await heartbeat({
      repository,
      spaceId: 'healthy-space',
      recordedAt: '2026-08-31T09:55:00.000Z',
    });
    await heartbeat({
      repository,
      spaceId: 'stale-space',
      recordedAt: '2026-08-31T07:00:00.000Z',
    });

    const health = await computeRunQuotaDriverHealth({
      internalRepository: repository.client,
      settings,
      detectionTargets: [
        {
          spaceId: 'healthy-space',
          enabled: true,
          reviewIntervalMinutes: 30,
          driverUpdatedAt: '2026-08-31T07:00:00.000Z',
        },
        {
          spaceId: 'stale-space',
          enabled: true,
          reviewIntervalMinutes: 30,
          driverUpdatedAt: '2026-08-31T07:00:00.000Z',
        },
        {
          spaceId: 'unknown-space',
          enabled: true,
          reviewIntervalMinutes: 30,
          driverUpdatedAt: '2026-08-31T09:45:00.000Z',
        },
      ],
      kiTarget: { enabled: false },
      maintenancePaused: false,
      now: '2026-08-31T10:00:00.000Z',
    });

    expect(health.detection).toEqual({
      status: 'degraded',
      checkedAt: '2026-08-31T10:00:00.000Z',
      staleSpaceIds: ['stale-space'],
    });
    expect(health.ki_extraction.status).toBe('not_applicable');
  });

  it('requires a post-transition heartbeat and becomes healthy immediately when it arrives', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await heartbeat({
      repository,
      spaceId: 'space-a',
      recordedAt: '2026-08-31T09:00:00.000Z',
    });
    const settings = await enableRunQuotas(repository, '2026-08-31T10:00:00.000Z');
    const target = {
      spaceId: 'space-a',
      enabled: true,
      reviewIntervalMinutes: 30,
      driverUpdatedAt: '2026-08-31T09:00:00.000Z',
    };

    const beforeHeartbeat = await computeRunQuotaDriverHealth({
      internalRepository: repository.client,
      settings,
      detectionTargets: [target],
      kiTarget: { enabled: false },
      maintenancePaused: false,
      now: '2026-08-31T10:30:00.000Z',
    });
    expect(beforeHeartbeat.detection.status).toBe('unknown');

    await heartbeat({
      repository,
      spaceId: 'space-a',
      recordedAt: '2026-08-31T10:31:00.000Z',
    });
    const afterHeartbeat = await computeRunQuotaDriverHealth({
      internalRepository: repository.client,
      settings,
      detectionTargets: [target],
      kiTarget: { enabled: false },
      maintenancePaused: false,
      now: '2026-08-31T10:32:00.000Z',
    });
    expect(afterHeartbeat.detection.status).toBe('healthy');
  });

  it('invalidates an old heartbeat after a cadence or recreated-space transition', async () => {
    const repository = createInMemoryRunQuotaRepository();
    const settings = await enableRunQuotas(repository, '2026-08-31T08:00:00.000Z');
    await heartbeat({
      repository,
      spaceId: 'space-a',
      recordedAt: '2026-08-31T09:50:00.000Z',
    });
    await recordRunQuotaScheduleTransition({
      internalRepository: repository.client,
      group: 'detection',
      spaceId: 'space-a',
      changedAt: '2026-08-31T10:00:00.000Z',
    });

    const health = await computeRunQuotaDriverHealth({
      internalRepository: repository.client,
      settings,
      detectionTargets: [
        {
          spaceId: 'space-a',
          enabled: true,
          reviewIntervalMinutes: 15,
          driverUpdatedAt: '2026-08-31T10:00:00.000Z',
        },
      ],
      kiTarget: { enabled: false },
      maintenancePaused: false,
      now: '2026-08-31T10:10:00.000Z',
    });

    expect(health.detection.status).toBe('unknown');
  });

  it('reports scheduled drivers as not applicable during global maintenance', async () => {
    const repository = createInMemoryRunQuotaRepository();
    const settings = await enableRunQuotas(repository, '2026-08-31T08:00:00.000Z');

    const health = await computeRunQuotaDriverHealth({
      internalRepository: repository.client,
      settings,
      detectionTargets: [
        {
          spaceId: 'space-a',
          enabled: true,
          reviewIntervalMinutes: 30,
          driverUpdatedAt: '2026-08-31T08:00:00.000Z',
        },
      ],
      kiTarget: {
        enabled: true,
        driverUpdatedAt: '2026-08-31T08:00:00.000Z',
      },
      maintenancePaused: true,
      now: '2026-08-31T10:00:00.000Z',
    });

    expect(health.detection.status).toBe('not_applicable');
    expect(health.ki_extraction.status).toBe('not_applicable');
  });
});
