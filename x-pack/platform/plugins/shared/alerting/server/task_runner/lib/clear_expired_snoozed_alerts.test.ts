/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import type { Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AuditLogger } from '@kbn/core-security-server';
import type { SnoozedAlertInstance } from '@kbn/alerting-types';
import { clearExpiredSnoozedAlerts } from './clear_expired_snoozed_alerts';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

let clock: sinon.SinonFakeTimers;

const NOW = new Date('2025-06-15T12:00:00.000Z');
const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
const mockAuditLogger: jest.Mocked<AuditLogger> = {
  log: jest.fn(),
  enabled: true,
  includeSavedObjectNames: false,
};

describe('clearExpiredSnoozedAlerts()', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers(NOW);
  });
  afterAll(() => clock.restore());

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditLogger.log.mockClear();
    clock.reset();
  });

  test('clears expired entries and leaves unexpired ones', async () => {
    const expiredEntry: SnoozedAlertInstance = {
      alertInstanceId: 'alert-expired',
      mutedAt: '2025-06-15T11:00:00.000Z',
      expiresAt: '2025-06-15T11:30:00.000Z', // 30 min ago
    };
    const unexpiredEntry: SnoozedAlertInstance = {
      alertInstanceId: 'alert-active',
      mutedAt: '2025-06-15T11:50:00.000Z',
      expiresAt: '2025-06-15T13:00:00.000Z', // 1 hour from now
    };

    const rule = getRule({
      snoozedAlerts: [expiredEntry, unexpiredEntry],
      mutedInstanceIds: ['alert-expired', 'alert-active'],
    });

    await clearExpiredSnoozedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).toHaveBeenCalledTimes(1);
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'alert:rule-1',
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        doc: {
          alert: {
            snoozedAlerts: [unexpiredEntry],
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
    const expiredEntry: SnoozedAlertInstance = {
      alertInstanceId: 'alert-expired',
      mutedAt: '2025-06-15T11:00:00.000Z',
      expiresAt: '2025-06-15T11:30:00.000Z',
    };
    const indefiniteEntry: SnoozedAlertInstance = {
      alertInstanceId: 'alert-indefinite',
      mutedAt: '2025-06-15T10:00:00.000Z',
      // no expiresAt -- indefinite mute
    };

    const rule = getRule({
      snoozedAlerts: [expiredEntry, indefiniteEntry],
      mutedInstanceIds: ['alert-expired', 'alert-indefinite'],
    });

    await clearExpiredSnoozedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).toHaveBeenCalledTimes(1);
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: {
          alert: {
            snoozedAlerts: [indefiniteEntry],
            mutedInstanceIds: ['alert-indefinite'],
          },
        },
      })
    );
  });

  test('clears expired entry that also has conditions', async () => {
    const expiredWithConditions: SnoozedAlertInstance = {
      alertInstanceId: 'alert-cond',
      mutedAt: '2025-06-15T11:00:00.000Z',
      expiresAt: '2025-06-15T11:30:00.000Z', // expired
      conditions: [
        { type: 'severity_change', field: 'kibana.alert.severity', snapshotValue: 'medium' },
      ],
      conditionOperator: 'any',
    };

    const rule = getRule({
      snoozedAlerts: [expiredWithConditions],
      mutedInstanceIds: ['alert-cond'],
    });

    await clearExpiredSnoozedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).toHaveBeenCalledTimes(1);
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: {
          alert: {
            snoozedAlerts: [],
            mutedInstanceIds: [],
          },
        },
      })
    );
  });

  test('does nothing when no entries are expired', async () => {
    const futureEntry: SnoozedAlertInstance = {
      alertInstanceId: 'alert-future',
      mutedAt: '2025-06-15T11:50:00.000Z',
      expiresAt: '2025-06-15T13:00:00.000Z', // 1 hour from now
    };

    const rule = getRule({
      snoozedAlerts: [futureEntry],
      mutedInstanceIds: ['alert-future'],
    });

    await clearExpiredSnoozedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).not.toHaveBeenCalled();
  });

  test('does nothing when snoozedAlerts is empty', async () => {
    const rule = getRule({ snoozedAlerts: [], mutedInstanceIds: [] });

    await clearExpiredSnoozedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).not.toHaveBeenCalled();
  });

  test('does nothing when snoozedAlerts is undefined', async () => {
    const rule = getRule({ snoozedAlerts: undefined, mutedInstanceIds: [] });

    await clearExpiredSnoozedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).not.toHaveBeenCalled();
  });

  test('passes version for optimistic concurrency', async () => {
    const expiredEntry: SnoozedAlertInstance = {
      alertInstanceId: 'alert-expired',
      mutedAt: '2025-06-15T11:00:00.000Z',
      expiresAt: '2025-06-15T11:30:00.000Z',
    };

    const rule = getRule({
      snoozedAlerts: [expiredEntry],
      mutedInstanceIds: ['alert-expired'],
    });

    await clearExpiredSnoozedAlerts({
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
            snoozedAlerts: [],
            mutedInstanceIds: [],
          },
        },
      })
    );
  });

  test('leaves mutedInstanceIds entries that have no corresponding snoozedAlerts entry', async () => {
    const expiredEntry: SnoozedAlertInstance = {
      alertInstanceId: 'alert-expired',
      mutedAt: '2025-06-15T11:00:00.000Z',
      expiresAt: '2025-06-15T11:30:00.000Z',
    };

    const rule = getRule({
      snoozedAlerts: [expiredEntry],
      // 'legacy-muted' is in mutedInstanceIds but has no snoozedAlerts entry
      mutedInstanceIds: ['alert-expired', 'legacy-muted'],
    });

    await clearExpiredSnoozedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: {
          alert: {
            snoozedAlerts: [],
            mutedInstanceIds: ['legacy-muted'],
          },
        },
      })
    );
  });

  test('handles multiple expired entries', async () => {
    const expired1: SnoozedAlertInstance = {
      alertInstanceId: 'alert-1',
      mutedAt: '2025-06-15T10:00:00.000Z',
      expiresAt: '2025-06-15T10:30:00.000Z',
    };
    const expired2: SnoozedAlertInstance = {
      alertInstanceId: 'alert-2',
      mutedAt: '2025-06-15T10:00:00.000Z',
      expiresAt: '2025-06-15T11:00:00.000Z',
    };
    const active: SnoozedAlertInstance = {
      alertInstanceId: 'alert-3',
      mutedAt: '2025-06-15T11:50:00.000Z',
      expiresAt: '2025-06-15T14:00:00.000Z',
    };

    const rule = getRule({
      snoozedAlerts: [expired1, expired2, active],
      mutedInstanceIds: ['alert-1', 'alert-2', 'alert-3'],
    });

    await clearExpiredSnoozedAlerts({ esClient, logger: mockLogger, rule });

    expect(esClient.update).toHaveBeenCalledTimes(1);
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: {
          alert: {
            snoozedAlerts: [active],
            mutedInstanceIds: ['alert-3'],
          },
        },
      })
    );
    expect(mockLogger.info).toHaveBeenCalledTimes(2);
  });

  test('emits audit event for each expired entry when auditLogger is provided', async () => {
    const expiredEntry: SnoozedAlertInstance = {
      alertInstanceId: 'alert-expired',
      mutedAt: '2025-06-15T11:00:00.000Z',
      expiresAt: '2025-06-15T11:30:00.000Z',
    };

    const rule = getRule({
      snoozedAlerts: [expiredEntry],
      mutedInstanceIds: ['alert-expired'],
    });

    await clearExpiredSnoozedAlerts({
      esClient,
      logger: mockLogger,
      rule,
      auditLogger: mockAuditLogger,
    });

    expect(mockAuditLogger.log).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('auto-unsnoozed alert of'),
        event: expect.objectContaining({
          action: 'rule_alert_unsnooze',
          category: ['database'],
          type: ['change'],
        }),
      })
    );
  });

  test('does not emit audit event when auditLogger is not provided', async () => {
    const expiredEntry: SnoozedAlertInstance = {
      alertInstanceId: 'alert-expired',
      mutedAt: '2025-06-15T11:00:00.000Z',
      expiresAt: '2025-06-15T11:30:00.000Z',
    };

    const rule = getRule({
      snoozedAlerts: [expiredEntry],
      mutedInstanceIds: ['alert-expired'],
    });

    await clearExpiredSnoozedAlerts({ esClient, logger: mockLogger, rule });

    expect(mockAuditLogger.log).not.toHaveBeenCalled();
  });

  test('does not emit audit event when nothing expired', async () => {
    const futureEntry: SnoozedAlertInstance = {
      alertInstanceId: 'alert-future',
      mutedAt: '2025-06-15T11:50:00.000Z',
      expiresAt: '2025-06-15T13:00:00.000Z',
    };

    const rule = getRule({
      snoozedAlerts: [futureEntry],
      mutedInstanceIds: ['alert-future'],
    });

    await clearExpiredSnoozedAlerts({
      esClient,
      logger: mockLogger,
      rule,
      auditLogger: mockAuditLogger,
    });

    expect(mockAuditLogger.log).not.toHaveBeenCalled();
  });
});

const getRule = ({
  snoozedAlerts,
  mutedInstanceIds,
}: {
  snoozedAlerts: SnoozedAlertInstance[] | undefined;
  mutedInstanceIds: string[];
}) => ({
  id: 'rule-1',
  name: 'Test Rule',
  snoozedAlerts,
  mutedInstanceIds,
});
