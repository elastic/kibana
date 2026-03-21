/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_UUID,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
  ALERT_UUID,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import {
  getTrackedAlerts,
  createEmptyTrackedAlerts,
  populateTrackedAlerts,
  findMissingAlertUuids,
  getAlertUuidsFromState,
} from './get_tracked_alerts';
import type { RawAlertInstance, RuleAlertData } from '../../types';
import type { SearchResult, TrackedAADAlerts } from '../types';

type TestAlertDoc = TrackedAADAlerts<RuleAlertData>['all'][string];

const logger = loggingSystemMock.create().get();
const ruleId = 'test-rule-id';
const ruleInfoMessage = "for test.rule-type:test-rule-id 'test-rule'";
const logTags = { tags: ['test.rule-type', ruleId, 'alerts-client'] };

const makeRawAlertInstance = (uuid: string): RawAlertInstance => ({
  meta: { uuid },
});

const makeStateFromUuids = (
  uuids: string[]
): {
  activeAlertsFromState: Record<string, RawAlertInstance>;
  recoveredAlertsFromState: Record<string, RawAlertInstance>;
} => ({
  activeAlertsFromState: Object.fromEntries(
    uuids.map((uuid, i) => [`alert-${i}`, makeRawAlertInstance(uuid)])
  ),
  recoveredAlertsFromState: {},
});

const makeHit = ({
  uuid,
  instanceId,
  status,
  executionUuid,
  index = '.alerts-test-000001',
  seqNo = 1,
  primaryTerm = 1,
}: {
  uuid: string;
  instanceId: string;
  status: string;
  executionUuid: string;
  index?: string;
  seqNo?: number;
  primaryTerm?: number;
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
  },
});

const makeExecutionHit = (executionUuid: string) => ({
  _index: '.alerts-test-000001',
  _id: 'x',
  fields: {
    [ALERT_RULE_EXECUTION_UUID]: [executionUuid],
  },
});

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

    it('getById finds alert by instance id', () => {
      const tracked = createEmptyTrackedAlerts<{}>();
      const mockAlert = {
        [ALERT_UUID]: 'uuid-1',
        [ALERT_INSTANCE_ID]: 'id-1',
      } as unknown as TestAlertDoc;
      tracked.all['uuid-1'] = mockAlert;
      expect(tracked.getById('id-1')).toBe(mockAlert);
      expect(tracked.getById('nonexistent')).toBeUndefined();
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

  describe('getTrackedAlerts', () => {
    it('fetches tracked alerts via execution uuid query', async () => {
      const search = jest
        .fn()
        .mockResolvedValueOnce({
          hits: [makeExecutionHit('exec-1'), makeExecutionHit('exec-2')],
        })
        .mockResolvedValueOnce({
          hits: [
            makeHit({
              uuid: 'uuid-1',
              instanceId: 'alert-1',
              status: ALERT_STATUS_ACTIVE,
              executionUuid: 'exec-1',
            }),
          ],
        });

      const result = await getTrackedAlerts({
        ruleId,
        lookBackWindow: 20,
        maxAlertLimit: 1000,
        ...makeStateFromUuids(['uuid-1']),
        search,
        logger,
        ruleInfoMessage,
        logTags,
      });

      expect(search).toHaveBeenCalledTimes(2);
      expect(result.all['uuid-1']).toBeDefined();
      expect(result.active['uuid-1']).toBeDefined();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('fetches missing alerts by id when state has extra uuids', async () => {
      const search = jest
        .fn()
        .mockResolvedValueOnce({
          hits: [makeExecutionHit('exec-1')],
        })
        .mockResolvedValueOnce({
          hits: [
            makeHit({
              uuid: 'uuid-1',
              instanceId: 'alert-1',
              status: ALERT_STATUS_ACTIVE,
              executionUuid: 'exec-1',
            }),
          ],
        })
        .mockResolvedValueOnce({
          hits: [
            makeHit({
              uuid: 'uuid-2',
              instanceId: 'alert-2',
              status: ALERT_STATUS_ACTIVE,
              executionUuid: 'exec-old',
              seqNo: 5,
              primaryTerm: 2,
            }),
          ],
        });

      const result = await getTrackedAlerts({
        ruleId,
        lookBackWindow: 20,
        maxAlertLimit: 1000,
        ...makeStateFromUuids(['uuid-1', 'uuid-2']),
        search,
        logger,
        ruleInfoMessage,
        logTags,
      });

      expect(search).toHaveBeenCalledTimes(3);

      // Verify the reconciliation query filters by ids
      expect(search.mock.calls[2][0]).toEqual(
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

      expect(result.all['uuid-1']).toBeDefined();
      expect(result.all['uuid-2']).toBeDefined();
      expect(result.seqNo['uuid-2']).toBe(5);
      expect(result.primaryTerm['uuid-2']).toBe(2);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Found 1 alerts in task state not returned by tracked alerts query'
        ),
        logTags
      );
    });

    it('does not fetch missing alerts when all state uuids are tracked', async () => {
      const search = jest
        .fn()
        .mockResolvedValueOnce({
          hits: [makeExecutionHit('exec-1')],
        })
        .mockResolvedValueOnce({
          hits: [
            makeHit({
              uuid: 'uuid-1',
              instanceId: 'alert-1',
              status: ALERT_STATUS_ACTIVE,
              executionUuid: 'exec-1',
            }),
          ],
        });

      await getTrackedAlerts({
        ruleId,
        lookBackWindow: 20,
        maxAlertLimit: 1000,
        ...makeStateFromUuids(['uuid-1']),
        search,
        logger,
        ruleInfoMessage,
        logTags,
      });

      expect(search).toHaveBeenCalledTimes(2);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('handles empty state uuids', async () => {
      const search = jest
        .fn()
        .mockResolvedValueOnce({
          hits: [makeExecutionHit('exec-1')],
        })
        .mockResolvedValueOnce({
          hits: [
            makeHit({
              uuid: 'uuid-1',
              instanceId: 'alert-1',
              status: ALERT_STATUS_ACTIVE,
              executionUuid: 'exec-1',
            }),
          ],
        });

      const result = await getTrackedAlerts({
        ruleId,
        lookBackWindow: 20,
        maxAlertLimit: 1000,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
        search,
        logger,
        ruleInfoMessage,
        logTags,
      });

      expect(search).toHaveBeenCalledTimes(2);
      expect(result.all['uuid-1']).toBeDefined();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('handles no execution uuids found with no state alerts', async () => {
      const search = jest.fn().mockResolvedValueOnce({
        hits: [],
      });

      const result = await getTrackedAlerts({
        ruleId,
        lookBackWindow: 20,
        maxAlertLimit: 1000,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
        search,
        logger,
        ruleInfoMessage,
        logTags,
      });

      expect(search).toHaveBeenCalledTimes(1);
      expect(Object.keys(result.all)).toHaveLength(0);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('fetches missing alerts when no execution UUIDs found but state has alerts', async () => {
      const search = jest
        .fn()
        .mockResolvedValueOnce({
          hits: [],
        })
        .mockResolvedValueOnce({
          hits: [
            makeHit({
              uuid: 'uuid-1',
              instanceId: 'alert-1',
              status: ALERT_STATUS_ACTIVE,
              executionUuid: 'exec-old',
              seqNo: 3,
              primaryTerm: 1,
            }),
          ],
        });

      const result = await getTrackedAlerts({
        ruleId,
        lookBackWindow: 20,
        maxAlertLimit: 1000,
        ...makeStateFromUuids(['uuid-1']),
        search,
        logger,
        ruleInfoMessage,
        logTags,
      });

      expect(search).toHaveBeenCalledTimes(2);
      expect(result.all['uuid-1']).toBeDefined();
      expect(result.seqNo['uuid-1']).toBe(3);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('correctly passes query parameters for execution query', async () => {
      const search = jest
        .fn()
        .mockResolvedValueOnce({
          hits: [makeExecutionHit('exec-1')],
        })
        .mockResolvedValueOnce({
          hits: [],
        });

      await getTrackedAlerts({
        ruleId,
        lookBackWindow: 15,
        maxAlertLimit: 500,
        activeAlertsFromState: {},
        recoveredAlertsFromState: {},
        search,
        logger,
        ruleInfoMessage,
        logTags,
      });

      expect(search.mock.calls[0][0]).toEqual({
        size: 15,
        query: {
          bool: {
            must: [{ term: { [ALERT_RULE_UUID]: ruleId } }],
          },
        },
        collapse: {
          field: ALERT_RULE_EXECUTION_UUID,
        },
        _source: false,
        sort: [{ [TIMESTAMP]: { order: 'desc' } }],
      });

      expect(search.mock.calls[1][0]).toEqual({
        size: 1000,
        seq_no_primary_term: true,
        query: {
          bool: {
            must: [{ term: { [ALERT_RULE_UUID]: ruleId } }],
            must_not: [{ term: { [ALERT_STATUS]: ALERT_STATUS_UNTRACKED } }],
            filter: [{ terms: { [ALERT_RULE_EXECUTION_UUID]: ['exec-1'] } }],
          },
        },
      });
    });

    it('logs error and returns partial results when fetchAlertsByIds fails', async () => {
      const searchError = new Error('search failure');
      const search = jest
        .fn()
        .mockResolvedValueOnce({
          hits: [makeExecutionHit('exec-1')],
        })
        .mockResolvedValueOnce({
          hits: [],
        })
        .mockRejectedValueOnce(searchError);

      const result = await getTrackedAlerts({
        ruleId,
        lookBackWindow: 20,
        maxAlertLimit: 1000,
        ...makeStateFromUuids(['uuid-1']),
        search,
        logger,
        ruleInfoMessage,
        logTags,
      });

      expect(Object.keys(result.all)).toHaveLength(0);

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

    it('handles multiple missing alerts', async () => {
      const search = jest
        .fn()
        .mockResolvedValueOnce({
          hits: [makeExecutionHit('exec-1')],
        })
        .mockResolvedValueOnce({
          hits: [],
        })
        .mockResolvedValueOnce({
          hits: [
            makeHit({
              uuid: 'uuid-1',
              instanceId: 'alert-1',
              status: ALERT_STATUS_ACTIVE,
              executionUuid: 'exec-old-1',
            }),
            makeHit({
              uuid: 'uuid-2',
              instanceId: 'alert-2',
              status: ALERT_STATUS_RECOVERED,
              executionUuid: 'exec-old-2',
            }),
          ],
        });

      const result = await getTrackedAlerts({
        ruleId,
        lookBackWindow: 20,
        maxAlertLimit: 1000,
        ...makeStateFromUuids(['uuid-1', 'uuid-2', 'uuid-3']),
        search,
        logger,
        ruleInfoMessage,
        logTags,
      });

      expect(search).toHaveBeenCalledTimes(3);

      expect(search.mock.calls[2][0].size).toBe(3);

      expect(result.active['uuid-1']).toBeDefined();
      expect(result.recovered['uuid-2']).toBeDefined();
      // uuid-3 was not found in ES either — just not in tracked
      expect(result.all['uuid-3']).toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Found 3 alerts in task state'),
        logTags
      );
    });
  });
});
