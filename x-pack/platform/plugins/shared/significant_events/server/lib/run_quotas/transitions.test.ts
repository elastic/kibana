/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInMemoryRunQuotaRepository } from './in_memory_repository.test_utils';
import {
  getRunQuotaHeartbeatId,
  mutateRunQuotaHeartbeat,
  mutateRunQuotaSettings,
  readRunQuotaSettings,
} from './repository';
import { RUN_QUOTA_HEARTBEAT_SO_TYPE } from './saved_objects';
import {
  applyRunQuotaSettingsApplicabilityTransition,
  recordRunQuotaScheduleTransition,
} from './transitions';

describe('run quota applicability transitions', () => {
  it('advances selected generations while preserving unknown attributes and groups', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await mutateRunQuotaSettings(repository.client, () => ({
      futureAttribute: { keep: true },
      applicability: {
        global: { generation: 4, changedAt: '2026-08-30T00:00:00.000Z' },
        groups: {
          future_group: { generation: 8, changedAt: '2026-08-29T00:00:00.000Z' },
          detection: { generation: 2, changedAt: '2026-08-30T00:00:00.000Z' },
        },
      },
    }));

    await mutateRunQuotaSettings(repository.client, (current) =>
      applyRunQuotaSettingsApplicabilityTransition({
        current,
        patch: {},
        global: true,
        groups: ['detection'],
        changedAt: '2026-08-31T12:00:00.000Z',
      })
    );

    const settings = await readRunQuotaSettings(repository.client);
    expect(settings.futureAttribute).toEqual({ keep: true });
    expect(settings.applicability).toEqual({
      global: { generation: 5, changedAt: '2026-08-31T12:00:00.000Z' },
      groups: {
        future_group: { generation: 8, changedAt: '2026-08-29T00:00:00.000Z' },
        detection: { generation: 3, changedAt: '2026-08-31T12:00:00.000Z' },
      },
    });
  });

  it('advances a per-space schedule generation without dropping future fields', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await mutateRunQuotaHeartbeat({
      internalRepository: repository.client,
      group: 'detection',
      spaceId: 'space-a',
      initialChangedAt: '2026-08-30T00:00:00.000Z',
      mutation: () => ({ futureAttribute: 'keep' }),
    });

    await recordRunQuotaScheduleTransition({
      internalRepository: repository.client,
      group: 'detection',
      spaceId: 'space-a',
      changedAt: '2026-08-31T12:00:00.000Z',
    });

    expect(
      repository.getAttributes(
        RUN_QUOTA_HEARTBEAT_SO_TYPE,
        getRunQuotaHeartbeatId('detection', 'space-a')
      )
    ).toEqual(
      expect.objectContaining({
        futureAttribute: 'keep',
        scheduleGeneration: 1,
        scheduleGenerationChangedAt: '2026-08-31T12:00:00.000Z',
      })
    );
  });
});
