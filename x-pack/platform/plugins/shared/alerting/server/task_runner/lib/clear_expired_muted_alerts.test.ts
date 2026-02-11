/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import type { Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { MutedAlertInstance } from '@kbn/alerting-types';
import { clearExpiredMutedAlerts } from './clear_expired_muted_alerts';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

let clock: sinon.SinonFakeTimers;

const NOW = new Date('2025-06-15T12:00:00.000Z');
const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

describe('clearExpiredMutedAlerts()', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers(NOW);
  });
  afterAll(() => clock.restore());

  beforeEach(() => {
    jest.clearAllMocks();
    clock.reset();
  });

  test('clears expired entries and leaves unexpired ones', async () => {
    const expiredEntry: MutedAlertInstance = {
      alertInstanceId: 'alert-expired',
      mutedAt: '2025-06-15T11:00:00.000Z',
      expiresAt: '2025-06-15T11:30:00.000Z', // 30 min ago
    };
    const unexpiredEntry: MutedAlertInstance = {
      alertInstanceId: 'alert-active',
      mutedAt: '2025-06-15T11:50:00.000Z',
      expiresAt: '2025-06-15T13:00:00.000Z', // 1 hour from now
    };

    const rule = getRule({
      mutedAlerts: [expiredEntry, unexpiredEntry],
      mutedInstanceIds: ['alert-expired', 'alert-active'],
    });

    await clearExpiredMutedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).toHaveBeenCalledTimes(1);
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'alert:rule-1',
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        doc: {
          alert: {
            mutedAlerts: [unexpiredEntry],
            mutedInstanceIds: ['alert-active'],
          },
        },
      })
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Cleared expired muted alert 'alert-expired' for rule 'rule-1'"
    );
  });

  test('clears expired entries and leaves indefinite (no expiresAt) ones', async () => {
    const expiredEntry: MutedAlertInstance = {
      alertInstanceId: 'alert-expired',
      mutedAt: '2025-06-15T11:00:00.000Z',
      expiresAt: '2025-06-15T11:30:00.000Z',
    };
    const indefiniteEntry: MutedAlertInstance = {
      alertInstanceId: 'alert-indefinite',
      mutedAt: '2025-06-15T10:00:00.000Z',
      // no expiresAt -- indefinite mute
    };

    const rule = getRule({
      mutedAlerts: [expiredEntry, indefiniteEntry],
      mutedInstanceIds: ['alert-expired', 'alert-indefinite'],
    });

    await clearExpiredMutedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).toHaveBeenCalledTimes(1);
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: {
          alert: {
            mutedAlerts: [indefiniteEntry],
            mutedInstanceIds: ['alert-indefinite'],
          },
        },
      })
    );
  });

  test('clears expired entry that also has conditions', async () => {
    const expiredWithConditions: MutedAlertInstance = {
      alertInstanceId: 'alert-cond',
      mutedAt: '2025-06-15T11:00:00.000Z',
      expiresAt: '2025-06-15T11:30:00.000Z', // expired
      conditions: [
        { type: 'severity_change', field: 'kibana.alert.severity', snapshotValue: 'medium' },
      ],
      conditionOperator: 'any',
    };

    const rule = getRule({
      mutedAlerts: [expiredWithConditions],
      mutedInstanceIds: ['alert-cond'],
    });

    await clearExpiredMutedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).toHaveBeenCalledTimes(1);
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: {
          alert: {
            mutedAlerts: [],
            mutedInstanceIds: [],
          },
        },
      })
    );
  });

  test('does nothing when no entries are expired', async () => {
    const futureEntry: MutedAlertInstance = {
      alertInstanceId: 'alert-future',
      mutedAt: '2025-06-15T11:50:00.000Z',
      expiresAt: '2025-06-15T13:00:00.000Z', // 1 hour from now
    };

    const rule = getRule({
      mutedAlerts: [futureEntry],
      mutedInstanceIds: ['alert-future'],
    });

    await clearExpiredMutedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).not.toHaveBeenCalled();
  });

  test('does nothing when mutedAlerts is empty', async () => {
    const rule = getRule({ mutedAlerts: [], mutedInstanceIds: [] });

    await clearExpiredMutedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).not.toHaveBeenCalled();
  });

  test('does nothing when mutedAlerts is undefined', async () => {
    const rule = getRule({ mutedAlerts: undefined, mutedInstanceIds: [] });

    await clearExpiredMutedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).not.toHaveBeenCalled();
  });

  test('passes version for optimistic concurrency', async () => {
    const expiredEntry: MutedAlertInstance = {
      alertInstanceId: 'alert-expired',
      mutedAt: '2025-06-15T11:00:00.000Z',
      expiresAt: '2025-06-15T11:30:00.000Z',
    };

    const rule = getRule({
      mutedAlerts: [expiredEntry],
      mutedInstanceIds: ['alert-expired'],
    });

    await clearExpiredMutedAlerts({
      esClient,
      logger: mockLogger,
      rule,
      version: 'WzQsMV0=',
    });

    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'alert:rule-1',
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        if_seq_no: 4,
        if_primary_term: 1,
        doc: {
          alert: {
            mutedAlerts: [],
            mutedInstanceIds: [],
          },
        },
      })
    );
  });

  test('leaves mutedInstanceIds entries that have no corresponding mutedAlerts entry', async () => {
    const expiredEntry: MutedAlertInstance = {
      alertInstanceId: 'alert-expired',
      mutedAt: '2025-06-15T11:00:00.000Z',
      expiresAt: '2025-06-15T11:30:00.000Z',
    };

    const rule = getRule({
      mutedAlerts: [expiredEntry],
      // 'legacy-muted' is in mutedInstanceIds but has no mutedAlerts entry
      mutedInstanceIds: ['alert-expired', 'legacy-muted'],
    });

    await clearExpiredMutedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: {
          alert: {
            mutedAlerts: [],
            mutedInstanceIds: ['legacy-muted'],
          },
        },
      })
    );
  });

  test('handles multiple expired entries', async () => {
    const expired1: MutedAlertInstance = {
      alertInstanceId: 'alert-1',
      mutedAt: '2025-06-15T10:00:00.000Z',
      expiresAt: '2025-06-15T10:30:00.000Z',
    };
    const expired2: MutedAlertInstance = {
      alertInstanceId: 'alert-2',
      mutedAt: '2025-06-15T10:00:00.000Z',
      expiresAt: '2025-06-15T11:00:00.000Z',
    };
    const active: MutedAlertInstance = {
      alertInstanceId: 'alert-3',
      mutedAt: '2025-06-15T11:50:00.000Z',
      expiresAt: '2025-06-15T14:00:00.000Z',
    };

    const rule = getRule({
      mutedAlerts: [expired1, expired2, active],
      mutedInstanceIds: ['alert-1', 'alert-2', 'alert-3'],
    });

    await clearExpiredMutedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).toHaveBeenCalledTimes(1);
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: {
          alert: {
            mutedAlerts: [active],
            mutedInstanceIds: ['alert-3'],
          },
        },
      })
    );
    expect(mockLogger.info).toHaveBeenCalledTimes(2);
  });
});

const getRule = ({
  mutedAlerts,
  mutedInstanceIds,
}: {
  mutedAlerts: MutedAlertInstance[] | undefined;
  mutedInstanceIds: string[];
}) => ({
  id: 'rule-1',
  mutedAlerts,
  mutedInstanceIds,
});
