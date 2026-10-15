/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_UUID,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_DELAYED,
  ALERT_UUID,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import {
  createEmptyTrackedAlerts,
  populateTrackedAlerts,
  findMissingAlertUuids,
  getAlertUuidsFromState,
} from './get_tracked_alerts';
import type { RawAlertInstance, RuleAlertData } from '../../types';
import type { SearchResult, TrackedAADAlerts } from '../types';

type TestAlertDoc = TrackedAADAlerts<RuleAlertData>['all'][string];

const ruleId = 'test-rule-id';

const makeRawAlertInstance = (uuid: string): RawAlertInstance => ({
  meta: { uuid },
});

const makeHit = ({
  uuid,
  instanceId,
  status,
  executionUuid,
  index = '.alerts-test-000001',
  seqNo = 1,
  primaryTerm = 1,
  start,
}: {
  uuid: string;
  instanceId: string;
  status: string;
  executionUuid: string;
  index?: string;
  seqNo?: number;
  primaryTerm?: number;
  start?: string;
}) => ({
  _index: index,
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
    ...(start ? { [ALERT_START]: start } : {}),
  },
});

const toHits = (hits: Array<ReturnType<typeof makeHit>>) =>
  hits as SearchResult<RuleAlertData>['hits'];

describe('get_tracked_alerts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('createEmptyTrackedAlerts', () => {
    it('creates an empty tracked alerts object', () => {
      const tracked = createEmptyTrackedAlerts();
      expect(tracked.indices).toEqual({});
      expect(tracked.active).toEqual({});
      expect(tracked.recovered).toEqual({});
      expect(tracked.delayed).toEqual({});
      expect(tracked.all).toEqual({});
      expect(tracked.seqNo).toEqual({});
      expect(tracked.primaryTerm).toEqual({});
    });

    it('get returns alert by uuid', () => {
      const tracked = createEmptyTrackedAlerts<{}>();
      const mockAlert = {
        [ALERT_UUID]: 'uuid-1',
        [ALERT_INSTANCE_ID]: 'id-1',
      } as unknown as TestAlertDoc;
      tracked.all['uuid-1'] = mockAlert;
      expect(tracked.get('uuid-1')).toBe(mockAlert);
    });

    it('creates an empty instance id index', () => {
      const tracked = createEmptyTrackedAlerts();
      expect(tracked.instanceIdIndex).toEqual({ active: {}, recovered: {}, delayed: {} });
    });

    it('getById finds alert by instance id', () => {
      const tracked = createEmptyTrackedAlerts<{}>();
      populateTrackedAlerts(
        tracked,
        toHits([
          makeHit({
            uuid: 'uuid-1',
            instanceId: 'id-1',
            status: ALERT_STATUS_ACTIVE,
            executionUuid: 'exec-1',
          }),
        ])
      );
      expect(tracked.getById('id-1')).toBe(tracked.all['uuid-1']);
      expect(tracked.getById('nonexistent')).toBeUndefined();
    });

    it('getById prefers active over recovered when same instance id exists in both', () => {
      const tracked = createEmptyTrackedAlerts<{}>();
      populateTrackedAlerts(
        tracked,
        toHits([
          makeHit({
            uuid: 'uuid-old',
            instanceId: 'id-1',
            status: ALERT_STATUS_RECOVERED,
            executionUuid: 'exec-1',
          }),
          makeHit({
            uuid: 'uuid-new',
            instanceId: 'id-1',
            status: ALERT_STATUS_ACTIVE,
            executionUuid: 'exec-2',
          }),
        ])
      );
      expect(tracked.getById('id-1')).toBe(tracked.all['uuid-new']);
    });

    it('getById prefers recovered over delayed when same instance id exists in both', () => {
      const tracked = createEmptyTrackedAlerts<{}>();
      populateTrackedAlerts(
        tracked,
        toHits([
          makeHit({
            uuid: 'uuid-delayed',
            instanceId: 'id-1',
            status: ALERT_STATUS_DELAYED,
            executionUuid: 'exec-1',
          }),
          makeHit({
            uuid: 'uuid-recovered',
            instanceId: 'id-1',
            status: ALERT_STATUS_RECOVERED,
            executionUuid: 'exec-2',
          }),
        ])
      );
      expect(tracked.getById('id-1')).toBe(tracked.all['uuid-recovered']);
    });

    it('getById falls back to delayed when no active or recovered match', () => {
      const tracked = createEmptyTrackedAlerts<{}>();
      populateTrackedAlerts(
        tracked,
        toHits([
          makeHit({
            uuid: 'uuid-delayed',
            instanceId: 'id-1',
            status: ALERT_STATUS_DELAYED,
            executionUuid: 'exec-1',
          }),
        ])
      );
      expect(tracked.getById('id-1')).toBe(tracked.all['uuid-delayed']);
    });

    it('getById returns the most recently started document when several share an instance id and status', () => {
      const tracked = createEmptyTrackedAlerts<{}>();
      const older = makeHit({
        uuid: 'uuid-older',
        instanceId: 'id-1',
        status: ALERT_STATUS_ACTIVE,
        executionUuid: 'exec-1',
        start: '2023-03-01T00:00:00.000Z',
      });
      const newer = makeHit({
        uuid: 'uuid-newer',
        instanceId: 'id-1',
        status: ALERT_STATUS_ACTIVE,
        executionUuid: 'exec-2',
        start: '2023-03-02T00:00:00.000Z',
      });

      // regardless of the order the documents are returned in
      const trackedNewerFirst = createEmptyTrackedAlerts<{}>();
      populateTrackedAlerts(tracked, toHits([older, newer]));
      populateTrackedAlerts(trackedNewerFirst, toHits([newer, older]));

      expect(tracked.getById('id-1')).toBe(tracked.all['uuid-newer']);
      expect(trackedNewerFirst.getById('id-1')).toBe(trackedNewerFirst.all['uuid-newer']);
      expect(tracked.instanceIdIndex.active).toEqual({ 'id-1': 'uuid-newer' });
    });

    it('getById keeps the first document seen when starts are equal', () => {
      const tracked = createEmptyTrackedAlerts<{}>();
      populateTrackedAlerts(
        tracked,
        toHits([
          makeHit({
            uuid: 'uuid-first',
            instanceId: 'id-1',
            status: ALERT_STATUS_ACTIVE,
            executionUuid: 'exec-1',
          }),
          makeHit({
            uuid: 'uuid-second',
            instanceId: 'id-1',
            status: ALERT_STATUS_ACTIVE,
            executionUuid: 'exec-2',
          }),
        ])
      );
      expect(tracked.getById('id-1')).toBe(tracked.all['uuid-first']);
    });
  });

  describe('populateTrackedAlerts', () => {
    it('populates active alerts', () => {
      const tracked = createEmptyTrackedAlerts<{}>();
      const hit = makeHit({
        uuid: 'uuid-1',
        instanceId: 'alert-1',
        status: ALERT_STATUS_ACTIVE,
        executionUuid: 'exec-1',
      });

      populateTrackedAlerts(tracked, [hit as SearchResult<RuleAlertData>['hits'][number]]);

      expect(tracked.all['uuid-1']).toBeDefined();
      expect(tracked.active['uuid-1']).toBeDefined();
      expect(tracked.recovered['uuid-1']).toBeUndefined();
      expect(tracked.indices['uuid-1']).toBe('.alerts-test-000001');
      expect(tracked.seqNo['uuid-1']).toBe(1);
      expect(tracked.primaryTerm['uuid-1']).toBe(1);
    });

    it('populates recovered alerts', () => {
      const tracked = createEmptyTrackedAlerts<{}>();
      const hit = makeHit({
        uuid: 'uuid-2',
        instanceId: 'alert-2',
        status: ALERT_STATUS_RECOVERED,
        executionUuid: 'exec-1',
      });

      populateTrackedAlerts(tracked, [hit as SearchResult<RuleAlertData>['hits'][number]]);

      expect(tracked.recovered['uuid-2']).toBeDefined();
      expect(tracked.active['uuid-2']).toBeUndefined();
    });

    it('populates delayed alerts', () => {
      const tracked = createEmptyTrackedAlerts<{}>();
      const hit = makeHit({
        uuid: 'uuid-3',
        instanceId: 'alert-3',
        status: ALERT_STATUS_DELAYED,
        executionUuid: 'exec-1',
      });

      populateTrackedAlerts(tracked, [hit as SearchResult<RuleAlertData>['hits'][number]]);

      expect(tracked.delayed['uuid-3']).toBeDefined();
      expect(tracked.active['uuid-3']).toBeUndefined();
      expect(tracked.recovered['uuid-3']).toBeUndefined();
    });

    it('handles multiple hits', () => {
      const tracked = createEmptyTrackedAlerts<{}>();
      const hits = [
        makeHit({
          uuid: 'uuid-1',
          instanceId: 'alert-1',
          status: ALERT_STATUS_ACTIVE,
          executionUuid: 'exec-1',
          seqNo: 10,
        }),
        makeHit({
          uuid: 'uuid-2',
          instanceId: 'alert-2',
          status: ALERT_STATUS_RECOVERED,
          executionUuid: 'exec-1',
          seqNo: 20,
        }),
      ];

      populateTrackedAlerts(tracked, hits as SearchResult<RuleAlertData>['hits']);

      expect(Object.keys(tracked.all)).toHaveLength(2);
      expect(Object.keys(tracked.active)).toHaveLength(1);
      expect(Object.keys(tracked.recovered)).toHaveLength(1);
    });
  });

  describe('findMissingAlertUuids', () => {
    it('returns uuids not present in tracked alerts', () => {
      const tracked = createEmptyTrackedAlerts<{}>();
      tracked.all['uuid-1'] = {} as unknown as TestAlertDoc;

      const missing = findMissingAlertUuids(['uuid-1', 'uuid-2', 'uuid-3'], tracked);
      expect(missing).toEqual(['uuid-2', 'uuid-3']);
    });

    it('returns empty when all present', () => {
      const tracked = createEmptyTrackedAlerts<{}>();
      tracked.all['uuid-1'] = {} as unknown as TestAlertDoc;
      tracked.all['uuid-2'] = {} as unknown as TestAlertDoc;

      const missing = findMissingAlertUuids(['uuid-1', 'uuid-2'], tracked);
      expect(missing).toEqual([]);
    });

    it('returns all when none present', () => {
      const tracked = createEmptyTrackedAlerts<{}>();

      const missing = findMissingAlertUuids(['uuid-1', 'uuid-2'], tracked);
      expect(missing).toEqual(['uuid-1', 'uuid-2']);
    });
  });

  describe('getAlertUuidsFromState', () => {
    it('extracts uuids from active and recovered alerts', () => {
      const uuids = getAlertUuidsFromState(
        {
          'alert-1': makeRawAlertInstance('uuid-1'),
          'alert-2': makeRawAlertInstance('uuid-2'),
        },
        {
          'alert-3': makeRawAlertInstance('uuid-3'),
        }
      );
      expect(uuids).toEqual(['uuid-1', 'uuid-2', 'uuid-3']);
    });

    it('skips entries without meta.uuid', () => {
      const uuids = getAlertUuidsFromState(
        {
          'alert-1': makeRawAlertInstance('uuid-1'),
          'alert-2': { meta: {} },
        },
        {
          'alert-3': {},
        }
      );
      expect(uuids).toEqual(['uuid-1']);
    });

    it('returns empty array when no alerts in state', () => {
      const uuids = getAlertUuidsFromState({}, {});
      expect(uuids).toEqual([]);
    });
  });
});
