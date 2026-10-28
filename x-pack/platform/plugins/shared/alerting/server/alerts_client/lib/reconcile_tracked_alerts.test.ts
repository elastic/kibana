/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_CONSECUTIVE_MATCHES,
  ALERT_DURATION,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_INSTANCE_ID,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_MAINTENANCE_WINDOW_NAMES,
  ALERT_PENDING_RECOVERED_COUNT,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_UUID,
  ALERT_SCHEDULED_ACTION_DATE,
  ALERT_SCHEDULED_ACTION_GROUP,
  ALERT_SCHEDULED_ACTION_THROTTLING,
  ALERT_START,
  ALERT_STATE_NAMESPACE,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_DELAYED,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
  ALERT_TRACKED,
  ALERT_UUID,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { createEmptyTrackedAlerts, populateTrackedAlerts } from './get_tracked_alerts';
import {
  alertDocToRawAlertInstance,
  reconcileTrackedAlertsWithState,
  restoreStateFromTrackedAlerts,
} from './reconcile_tracked_alerts';
import type { RawAlertInstance, RuleAlertData } from '../../types';
import type { SearchResult } from '../types';

const logger = loggingSystemMock.create().get();
const ruleId = 'rule-1';
const ruleInfoMessage = "for test.rule-type:rule-1 'test-rule'";
const logTags = { tags: ['test.rule-type', 'rule-1', 'alerts-client'] };

const makeStateFromUuids = (
  uuids: string[]
): {
  activeAlertsFromState: Record<string, RawAlertInstance>;
  recoveredAlertsFromState: Record<string, RawAlertInstance>;
} => ({
  activeAlertsFromState: Object.fromEntries(
    uuids.map((uuid, i) => [`alert-${i}`, { meta: { uuid } }])
  ),
  recoveredAlertsFromState: {},
});

// Search hit in the shape the ES client returns, for the orchestrator tests.
const makeSearchHit = ({
  uuid,
  instanceId,
  status,
  executionUuid,
  seqNo = 1,
  primaryTerm = 1,
}: {
  uuid: string;
  instanceId: string;
  status: string;
  executionUuid: string;
  seqNo?: number;
  primaryTerm?: number;
}) => ({
  _index: '.alerts-test-000001',
  _id: uuid,
  _seq_no: seqNo,
  _primary_term: primaryTerm,
  _source: {
    [ALERT_UUID]: uuid,
    [ALERT_INSTANCE_ID]: instanceId,
    [ALERT_STATUS]: status,
    [ALERT_RULE_UUID]: ruleId,
    [ALERT_RULE_EXECUTION_UUID]: executionUuid,
    [TIMESTAMP]: '2023-03-28T12:27:28.159Z',
  },
});

const reconcileWithSearch = (
  search: jest.Mock,
  state: ReturnType<typeof makeStateFromUuids> = makeStateFromUuids([]),
  maxAlerts = 1000
) =>
  reconcileTrackedAlertsWithState({
    ruleId,
    ...state,
    maxAlerts,
    search,
    logger,
    ruleInfoMessage,
    logTags,
  });

const makeDoc = ({
  uuid,
  instanceId,
  status,
  start = '2024-01-01T00:00:00.000Z',
  extra = {},
}: {
  uuid: string;
  instanceId: string;
  status: string;
  start?: string;
  extra?: Record<string, unknown>;
}) =>
  ({
    [TIMESTAMP]: start,
    [ALERT_UUID]: uuid,
    [ALERT_INSTANCE_ID]: instanceId,
    [ALERT_STATUS]: status,
    [ALERT_RULE_UUID]: 'rule-1',
    [ALERT_START]: start,
    [ALERT_DURATION]: 60_000_000,
    [ALERT_FLAPPING]: false,
    [ALERT_FLAPPING_HISTORY]: [true, false],
    [ALERT_CONSECUTIVE_MATCHES]: 3,
    [ALERT_PENDING_RECOVERED_COUNT]: 0,
    [ALERT_MAINTENANCE_WINDOW_IDS]: ['mw-1'],
    [ALERT_MAINTENANCE_WINDOW_NAMES]: ['MW 1'],
    ...extra,
  } as unknown as Alert & RuleAlertData);

const makeHit = (doc: Alert & RuleAlertData) => ({
  _index: '.internal.alerts-test.alerts-default-000001',
  _id: doc[ALERT_UUID],
  _seq_no: 1,
  _primary_term: 1,
  _source: doc,
});

const buildTrackedAlerts = (docs: Array<Alert & RuleAlertData>) => {
  const trackedAlerts = createEmptyTrackedAlerts<RuleAlertData>();
  populateTrackedAlerts(
    trackedAlerts,
    docs.map(makeHit) as unknown as SearchResult<RuleAlertData>['hits']
  );
  return trackedAlerts;
};

const restore = (
  trackedAlerts: ReturnType<typeof buildTrackedAlerts>,
  activeAlertsFromState: Record<string, RawAlertInstance> = {},
  maxAlerts = 1000,
  recoveredAlertsFromState: Record<string, RawAlertInstance> = {}
) =>
  restoreStateFromTrackedAlerts({
    trackedAlerts,
    activeAlertsFromState,
    recoveredAlertsFromState,
    maxAlerts,
    logger,
    ruleInfoMessage,
    logTags,
  });

describe('reconcile_tracked_alerts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('alertDocToRawAlertInstance', () => {
    it('maps framework fields from the alert document into task state', () => {
      const doc = makeDoc({
        uuid: 'uuid-1',
        instanceId: 'host-1',
        status: ALERT_STATUS_ACTIVE,
        extra: {
          [ALERT_STATE_NAMESPACE]: { grouping: { host: 'host-1' } },
          [ALERT_SCHEDULED_ACTION_GROUP]: 'default',
          [ALERT_SCHEDULED_ACTION_DATE]: '2024-01-01T00:01:00.000Z',
          [ALERT_SCHEDULED_ACTION_THROTTLING]: { 'action-1': { date: '2024-01-01T00:01:00.000Z' } },
        },
      });

      expect(alertDocToRawAlertInstance(doc)).toEqual({
        state: {
          grouping: { host: 'host-1' },
          start: '2024-01-01T00:00:00.000Z',
          duration: '60000000000',
        },
        meta: {
          uuid: 'uuid-1',
          flapping: false,
          flappingHistory: [true, false],
          activeCount: 3,
          pendingRecoveredCount: 0,
          maintenanceWindowIds: ['mw-1'],
          maintenanceWindowNames: ['MW 1'],
          lastScheduledActions: {
            group: 'default',
            date: '2024-01-01T00:01:00.000Z',
            actions: { 'action-1': { date: '2024-01-01T00:01:00.000Z' } },
          },
        },
      });
    });

    it('omits fields that are not present on the document', () => {
      const doc = {
        [ALERT_UUID]: 'uuid-1',
        [ALERT_INSTANCE_ID]: 'host-1',
        [ALERT_STATUS]: ALERT_STATUS_DELAYED,
      } as unknown as Alert;

      expect(alertDocToRawAlertInstance(doc)).toEqual({
        state: {},
        meta: {
          uuid: 'uuid-1',
          flappingHistory: [],
          maintenanceWindowIds: [],
          maintenanceWindowNames: [],
        },
      });
    });

    it('does not set lastScheduledActions when only the group is present', () => {
      const doc = makeDoc({
        uuid: 'uuid-1',
        instanceId: 'host-1',
        status: ALERT_STATUS_ACTIVE,
        extra: { [ALERT_SCHEDULED_ACTION_GROUP]: 'default' },
      });

      expect(alertDocToRawAlertInstance(doc).meta?.lastScheduledActions).toBeUndefined();
    });

    it('ignores a non-object rule type state', () => {
      const doc = makeDoc({
        uuid: 'uuid-1',
        instanceId: 'host-1',
        status: ALERT_STATUS_ACTIVE,
        extra: { [ALERT_STATE_NAMESPACE]: 'not-an-object' },
      });

      expect(alertDocToRawAlertInstance(doc).state).toEqual({
        start: '2024-01-01T00:00:00.000Z',
        duration: '60000000000',
      });
    });
  });

  describe('restoreStateFromTrackedAlerts', () => {
    it('restores active and delayed alerts that are missing from task state', () => {
      const trackedAlerts = buildTrackedAlerts([
        makeDoc({ uuid: 'active-uuid', instanceId: 'host-1', status: ALERT_STATUS_ACTIVE }),
        makeDoc({ uuid: 'delayed-uuid', instanceId: 'host-2', status: ALERT_STATUS_DELAYED }),
      ]);

      const result = restore(trackedAlerts);

      expect(result.restoredInstanceIds).toEqual(['host-1', 'host-2']);
      expect(result.skippedInstanceIds).toEqual([]);
      expect(result.activeAlertsFromState['host-1'].meta?.uuid).toBe('active-uuid');
      expect(result.activeAlertsFromState['host-2'].meta?.uuid).toBe('delayed-uuid');
      expect(logger.warn).toHaveBeenCalledWith(
        `Restored 2 tracked alert(s) missing from task state ${ruleInfoMessage}: host-1, host-2`,
        logTags
      );
    });

    it('keeps the task state entry when the instance id is already tracked', () => {
      const trackedAlerts = buildTrackedAlerts([
        makeDoc({ uuid: 'aad-uuid', instanceId: 'host-1', status: ALERT_STATUS_ACTIVE }),
      ]);
      const stateEntry = { meta: { uuid: 'state-uuid' }, state: { foo: 'bar' } };

      const result = restore(trackedAlerts, { 'host-1': stateEntry });

      expect(result.restoredInstanceIds).toEqual([]);
      expect(result.activeAlertsFromState).toEqual({ 'host-1': stateEntry });
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('does not restore recovered alerts', () => {
      const trackedAlerts = buildTrackedAlerts([
        makeDoc({ uuid: 'recovered-uuid', instanceId: 'host-1', status: ALERT_STATUS_RECOVERED }),
      ]);

      const result = restore(trackedAlerts);

      expect(result.restoredInstanceIds).toEqual([]);
      expect(result.activeAlertsFromState).toEqual({});
    });

    it('does not mutate the task state passed in', () => {
      const trackedAlerts = buildTrackedAlerts([
        makeDoc({ uuid: 'active-uuid', instanceId: 'host-1', status: ALERT_STATUS_ACTIVE }),
      ]);
      const activeAlertsFromState = {};
      const recoveredAlertsFromState = { 'host-1': { meta: { uuid: 'old-uuid' } } };

      restore(trackedAlerts, activeAlertsFromState, 1000, recoveredAlertsFromState);

      expect(activeAlertsFromState).toEqual({});
      expect(recoveredAlertsFromState).toEqual({ 'host-1': { meta: { uuid: 'old-uuid' } } });
    });

    it('drops the recovered state entry of an instance whose active document is restored', () => {
      const trackedAlerts = buildTrackedAlerts([
        makeDoc({ uuid: 'old-uuid', instanceId: 'host-1', status: ALERT_STATUS_RECOVERED }),
        makeDoc({ uuid: 'new-uuid', instanceId: 'host-1', status: ALERT_STATUS_ACTIVE }),
      ]);
      const recoveredAlertsFromState = {
        'host-1': { meta: { uuid: 'old-uuid' } },
        'host-2': { meta: { uuid: 'other-uuid' } },
      };

      const result = restore(trackedAlerts, {}, 1000, recoveredAlertsFromState);

      expect(result.activeAlertsFromState['host-1'].meta?.uuid).toBe('new-uuid');
      expect(result.recoveredAlertsFromState).toEqual({
        'host-2': { meta: { uuid: 'other-uuid' } },
      });
    });

    it('does not restore a document the recovered state already holds under the same uuid', () => {
      // The recovery write for this document was lost; state is right, the document is stale.
      const trackedAlerts = buildTrackedAlerts([
        makeDoc({ uuid: 'uuid-1', instanceId: 'host-1', status: ALERT_STATUS_ACTIVE }),
      ]);
      const activeAlertsFromState = {};
      const recoveredAlertsFromState = { 'host-1': { meta: { uuid: 'uuid-1' } } };

      const result = restore(trackedAlerts, activeAlertsFromState, 1000, recoveredAlertsFromState);

      expect(result.restoredInstanceIds).toEqual([]);
      expect(result.activeAlertsFromState).toBe(activeAlertsFromState);
      expect(result.recoveredAlertsFromState).toBe(recoveredAlertsFromState);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('returns the recovered state untouched when nothing is restored', () => {
      const trackedAlerts = buildTrackedAlerts([
        makeDoc({ uuid: 'old-uuid', instanceId: 'host-1', status: ALERT_STATUS_RECOVERED }),
      ]);
      const recoveredAlertsFromState = { 'host-1': { meta: { uuid: 'old-uuid' } } };

      const result = restore(trackedAlerts, {}, 1000, recoveredAlertsFromState);

      expect(result.recoveredAlertsFromState).toBe(recoveredAlertsFromState);
    });

    it('restores the most recently started document when several active documents share an instance id', () => {
      const trackedAlerts = buildTrackedAlerts([
        makeDoc({
          uuid: 'older-uuid',
          instanceId: 'host-1',
          status: ALERT_STATUS_ACTIVE,
          start: '2024-01-01T00:00:00.000Z',
        }),
        makeDoc({
          uuid: 'newer-uuid',
          instanceId: 'host-1',
          status: ALERT_STATUS_ACTIVE,
          start: '2024-01-02T00:00:00.000Z',
        }),
      ]);

      const result = restore(trackedAlerts);

      expect(result.restoredInstanceIds).toEqual(['host-1']);
      expect(result.activeAlertsFromState['host-1'].meta?.uuid).toBe('newer-uuid');
    });

    it('prefers the active document over a delayed one for the same instance id', () => {
      const trackedAlerts = buildTrackedAlerts([
        makeDoc({ uuid: 'delayed-uuid', instanceId: 'host-1', status: ALERT_STATUS_DELAYED }),
        makeDoc({ uuid: 'active-uuid', instanceId: 'host-1', status: ALERT_STATUS_ACTIVE }),
      ]);

      const result = restore(trackedAlerts);

      expect(result.activeAlertsFromState['host-1'].meta?.uuid).toBe('active-uuid');
    });

    it('stops restoring at the max alert limit and logs the skipped alerts', () => {
      const trackedAlerts = buildTrackedAlerts([
        makeDoc({ uuid: 'uuid-1', instanceId: 'host-1', status: ALERT_STATUS_ACTIVE }),
        makeDoc({ uuid: 'uuid-2', instanceId: 'host-2', status: ALERT_STATUS_ACTIVE }),
        makeDoc({ uuid: 'uuid-3', instanceId: 'host-3', status: ALERT_STATUS_ACTIVE }),
      ]);

      const result = restore(trackedAlerts, { 'host-0': { meta: { uuid: 'uuid-0' } } }, 2);

      expect(Object.keys(result.activeAlertsFromState)).toEqual(['host-0', 'host-1']);
      expect(result.restoredInstanceIds).toEqual(['host-1']);
      expect(result.skippedInstanceIds).toEqual(['host-2', 'host-3']);
      expect(logger.warn).toHaveBeenCalledWith(
        `Skipped restoring 2 tracked alert(s) missing from task state because the max alert limit (2) was reached ${ruleInfoMessage}: host-2, host-3`,
        logTags
      );
    });

    it('truncates the list of instance ids in the log message', () => {
      const trackedAlerts = buildTrackedAlerts(
        Array.from({ length: 12 }, (_, i) =>
          makeDoc({ uuid: `uuid-${i}`, instanceId: `host-${i}`, status: ALERT_STATUS_ACTIVE })
        )
      );

      restore(trackedAlerts);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('host-9 and 2 more'),
        logTags
      );
    });
  });
  describe('reconcileTrackedAlertsWithState', () => {
    it('fetches tracked alerts via tracked field query', async () => {
      const search = jest.fn().mockResolvedValueOnce({
        hits: [
          makeSearchHit({
            uuid: 'uuid-1',
            instanceId: 'alert-0',
            status: ALERT_STATUS_ACTIVE,
            executionUuid: 'exec-1',
          }),
        ],
      });

      const result = await reconcileWithSearch(search, makeStateFromUuids(['uuid-1']));

      expect(search).toHaveBeenCalledTimes(1);
      expect(search.mock.calls[0][0]).toEqual({
        size: 10000,
        seq_no_primary_term: true,
        query: {
          bool: {
            must: [{ term: { [ALERT_RULE_UUID]: ruleId } }, { term: { [ALERT_TRACKED]: true } }],
            must_not: [{ term: { [ALERT_STATUS]: ALERT_STATUS_UNTRACKED } }],
          },
        },
      });
      expect(result.trackedAlerts.all['uuid-1']).toBeDefined();
      expect(result.trackedAlerts.active['uuid-1']).toBeDefined();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('rethrows when the tracked alerts query fails', async () => {
      const search = jest.fn().mockRejectedValueOnce(new Error('search failure'));

      await expect(reconcileWithSearch(search)).rejects.toThrow('search failure');
    });

    describe('state -> index', () => {
      it('fetches missing alerts by id when state has extra uuids', async () => {
        const search = jest
          .fn()
          .mockResolvedValueOnce({
            hits: [
              makeSearchHit({
                uuid: 'uuid-1',
                instanceId: 'alert-1',
                status: ALERT_STATUS_ACTIVE,
                executionUuid: 'exec-1',
              }),
            ],
          })
          .mockResolvedValueOnce({
            hits: [
              makeSearchHit({
                uuid: 'uuid-2',
                instanceId: 'alert-2',
                status: ALERT_STATUS_ACTIVE,
                executionUuid: 'exec-old',
                seqNo: 5,
                primaryTerm: 2,
              }),
            ],
          });

        const result = await reconcileWithSearch(search, makeStateFromUuids(['uuid-1', 'uuid-2']));

        expect(search).toHaveBeenCalledTimes(2);
        expect(search.mock.calls[1][0]).toEqual(
          expect.objectContaining({
            size: 1,
            seq_no_primary_term: true,
            query: expect.objectContaining({
              bool: expect.objectContaining({
                filter: [{ ids: { values: ['uuid-2'] } }],
              }),
            }),
          })
        );

        expect(result.trackedAlerts.all['uuid-1']).toBeDefined();
        expect(result.trackedAlerts.all['uuid-2']).toBeDefined();
        expect(result.trackedAlerts.seqNo['uuid-2']).toBe(5);
        expect(result.trackedAlerts.primaryTerm['uuid-2']).toBe(2);
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining(
            'Found 1 alerts in task state not returned by tracked alerts query'
          ),
          logTags
        );
      });

      it('does not fetch missing alerts when all state uuids are tracked', async () => {
        const search = jest.fn().mockResolvedValueOnce({
          hits: [
            makeSearchHit({
              uuid: 'uuid-1',
              instanceId: 'alert-0',
              status: ALERT_STATUS_ACTIVE,
              executionUuid: 'exec-1',
            }),
          ],
        });

        await reconcileWithSearch(search, makeStateFromUuids(['uuid-1']));

        expect(search).toHaveBeenCalledTimes(1);
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('handles no tracked alerts found with no state alerts', async () => {
        const search = jest.fn().mockResolvedValueOnce({ hits: [] });

        const result = await reconcileWithSearch(search);

        expect(search).toHaveBeenCalledTimes(1);
        expect(Object.keys(result.trackedAlerts.all)).toHaveLength(0);
        expect(result.activeAlertsFromState).toEqual({});
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('fetches missing alerts when no tracked alerts found but state has alerts', async () => {
        const search = jest
          .fn()
          .mockResolvedValueOnce({ hits: [] })
          .mockResolvedValueOnce({
            hits: [
              makeSearchHit({
                uuid: 'uuid-1',
                instanceId: 'alert-1',
                status: ALERT_STATUS_ACTIVE,
                executionUuid: 'exec-old',
                seqNo: 3,
                primaryTerm: 1,
              }),
            ],
          });

        const result = await reconcileWithSearch(search, makeStateFromUuids(['uuid-1']));

        expect(search).toHaveBeenCalledTimes(2);
        expect(result.trackedAlerts.all['uuid-1']).toBeDefined();
        expect(result.trackedAlerts.seqNo['uuid-1']).toBe(3);
        expect(logger.warn).toHaveBeenCalled();
      });

      it('handles multiple missing alerts', async () => {
        const search = jest
          .fn()
          .mockResolvedValueOnce({ hits: [] })
          .mockResolvedValueOnce({
            hits: [
              makeSearchHit({
                uuid: 'uuid-1',
                instanceId: 'alert-1',
                status: ALERT_STATUS_ACTIVE,
                executionUuid: 'exec-old-1',
              }),
              makeSearchHit({
                uuid: 'uuid-2',
                instanceId: 'alert-2',
                status: ALERT_STATUS_RECOVERED,
                executionUuid: 'exec-old-2',
              }),
            ],
          });

        const result = await reconcileWithSearch(
          search,
          makeStateFromUuids(['uuid-1', 'uuid-2', 'uuid-3'])
        );

        expect(search).toHaveBeenCalledTimes(2);
        expect(search.mock.calls[1][0].size).toBe(3);
        expect(result.trackedAlerts.active['uuid-1']).toBeDefined();
        expect(result.trackedAlerts.recovered['uuid-2']).toBeDefined();
        expect(result.trackedAlerts.all['uuid-3']).toBeUndefined();
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Found 3 alerts in task state'),
          logTags
        );
      });

      it('logs error and returns partial results when the fetch by id fails', async () => {
        const searchError = new Error('search failure');
        const search = jest
          .fn()
          .mockResolvedValueOnce({ hits: [] })
          .mockRejectedValueOnce(searchError);

        const result = await reconcileWithSearch(search, makeStateFromUuids(['uuid-1']));

        expect(Object.keys(result.trackedAlerts.all)).toHaveLength(0);
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Found 1 alerts in task state'),
          logTags
        );
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('Error fetching missing tracked alerts'),
          expect.objectContaining({
            tags: logTags.tags,
            error: expect.objectContaining({ stack_trace: searchError.stack }),
          })
        );
      });
    });

    describe('index -> state', () => {
      it('restores tracked alerts that are missing from task state', async () => {
        const search = jest.fn().mockResolvedValueOnce({
          hits: [
            makeSearchHit({
              uuid: 'uuid-1',
              instanceId: 'alert-1',
              status: ALERT_STATUS_ACTIVE,
              executionUuid: 'exec-1',
            }),
          ],
        });

        const result = await reconcileWithSearch(search);

        expect(search).toHaveBeenCalledTimes(1);
        expect(result.restoredInstanceIds).toEqual(['alert-1']);
        expect(result.activeAlertsFromState['alert-1'].meta?.uuid).toBe('uuid-1');
        expect(logger.warn).toHaveBeenCalledWith(
          `Restored 1 tracked alert(s) missing from task state ${ruleInfoMessage}: alert-1`,
          logTags
        );
      });

      it('does not restore alerts that were fetched by id from task state', async () => {
        const search = jest
          .fn()
          .mockResolvedValueOnce({ hits: [] })
          .mockResolvedValueOnce({
            hits: [
              makeSearchHit({
                uuid: 'uuid-1',
                instanceId: 'alert-0',
                status: ALERT_STATUS_ACTIVE,
                executionUuid: 'exec-old',
              }),
            ],
          });
        const state = makeStateFromUuids(['uuid-1']);

        const result = await reconcileWithSearch(search, state);

        expect(result.restoredInstanceIds).toEqual([]);
        expect(result.activeAlertsFromState).toEqual(state.activeAlertsFromState);
      });

      it('passes the max alert limit through', async () => {
        const search = jest.fn().mockResolvedValueOnce({
          hits: [
            makeSearchHit({
              uuid: 'uuid-1',
              instanceId: 'alert-1',
              status: ALERT_STATUS_ACTIVE,
              executionUuid: 'exec-1',
            }),
            makeSearchHit({
              uuid: 'uuid-2',
              instanceId: 'alert-2',
              status: ALERT_STATUS_ACTIVE,
              executionUuid: 'exec-1',
            }),
          ],
        });

        const result = await reconcileWithSearch(search, makeStateFromUuids([]), 1);

        expect(result.restoredInstanceIds).toEqual(['alert-1']);
        expect(result.skippedInstanceIds).toEqual(['alert-2']);
      });
    });
  });
});
