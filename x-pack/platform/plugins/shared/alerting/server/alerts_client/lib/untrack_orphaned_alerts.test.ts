/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  ALERT_END,
  ALERT_INSTANCE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_TIME_RANGE,
  ALERT_TRACKED,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import type { RuleAlertData } from '../../types';
import type { SearchResult } from '../types';
import { MAX_ORPHANED_ALERTS_PER_RUN, untrackOrphanedAlerts } from './untrack_orphaned_alerts';

const ruleId = 'rule-1';
const ruleInfoMessage = "for test.rule-type:rule-1 'test-rule'";
const logTags = { tags: ['test.rule-type', 'rule-1', 'alerts-client'] };
const timestamp = '2024-02-01T00:00:00.000Z';
const start = '2024-01-01T00:00:00.000Z';
const index = '.internal.alerts-test.alerts-default-000001';

const makeHit = (uuid: string, overrides: Record<string, unknown> = {}) => ({
  _index: index,
  _id: uuid,
  _seq_no: 7,
  _primary_term: 2,
  _source: {
    [ALERT_UUID]: uuid,
    [ALERT_INSTANCE_ID]: `instance-${uuid}`,
    [ALERT_RULE_UUID]: ruleId,
    [ALERT_STATUS]: 'active',
    [ALERT_START]: start,
    [ALERT_TIME_RANGE]: { gte: start },
  },
  ...overrides,
});

const makeSearchResult = (
  hits: Array<ReturnType<typeof makeHit>>,
  failedShards = 0
): SearchResult<RuleAlertData> =>
  ({
    hits,
    total: { relation: 'eq', value: hits.length },
    aggregations: undefined,
    _shards: { total: 1, successful: 1 - failedShards, failed: failedShards },
  } as unknown as SearchResult<RuleAlertData>);

const makeBulkResponse = (errorTypes: Array<string | undefined>): BulkResponse =>
  ({
    errors: errorTypes.some(Boolean),
    took: 1,
    items: errorTypes.map((type) => ({
      index: type ? { status: 409, error: { type, reason: 'failed' } } : { status: 200 },
    })),
  } as unknown as BulkResponse);

describe('untrackOrphanedAlerts', () => {
  let logger: ReturnType<(typeof loggingSystemMock)['createLogger']>;
  let search: jest.Mock;
  let bulk: jest.Mock;

  const run = (knownAlertUuids: string[] = []) =>
    untrackOrphanedAlerts<RuleAlertData>({
      ruleId,
      knownAlertUuids,
      timestamp,
      search,
      bulk,
      logger,
      ruleInfoMessage,
      logTags,
    });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    search = jest.fn().mockResolvedValue(makeSearchResult([]));
    bulk = jest.fn().mockResolvedValue(makeBulkResponse([]));
  });

  test('searches for active alert documents of the rule that are not tracked', async () => {
    await run();

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith({
      size: MAX_ORPHANED_ALERTS_PER_RUN,
      seq_no_primary_term: true,
      query: {
        bool: {
          filter: [{ term: { [ALERT_RULE_UUID]: ruleId } }, { term: { [ALERT_STATUS]: 'active' } }],
          must_not: [{ term: { [ALERT_TRACKED]: true } }],
        },
      },
    });
  });

  test('excludes the alert documents the run has already loaded', async () => {
    await run(['uuid-in-state-1', 'uuid-in-state-2']);

    expect(search.mock.calls[0][0].query.bool.must_not).toEqual([
      { term: { [ALERT_TRACKED]: true } },
      { ids: { values: ['uuid-in-state-1', 'uuid-in-state-2'] } },
    ]);
  });

  test('never untracks an alert document the run has already loaded, even if the search returns it', async () => {
    search.mockResolvedValue(makeSearchResult([makeHit('uuid-in-state-1'), makeHit('uuid-1')]));
    bulk.mockResolvedValue(makeBulkResponse([undefined]));

    await expect(run(['uuid-in-state-1'])).resolves.toEqual({
      untrackedCount: 1,
      isComplete: true,
    });

    const operations = bulk.mock.calls[0][0];
    expect(operations).toHaveLength(2);
    expect(operations[0]).toEqual({ index: expect.objectContaining({ _id: 'uuid-1' }) });
  });

  test('is complete and writes nothing when there are no orphaned alert documents', async () => {
    await expect(run()).resolves.toEqual({ untrackedCount: 0, isComplete: true });

    expect(bulk).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('untracks each orphaned alert document in place, guarded by its sequence number', async () => {
    search.mockResolvedValue(makeSearchResult([makeHit('uuid-1'), makeHit('uuid-2')]));
    bulk.mockResolvedValue(makeBulkResponse([undefined, undefined]));

    await expect(run()).resolves.toEqual({ untrackedCount: 2, isComplete: true });

    expect(bulk).toHaveBeenCalledTimes(1);
    const operations = bulk.mock.calls[0][0];
    expect(operations).toHaveLength(4);
    expect(operations[0]).toEqual({
      index: {
        _id: 'uuid-1',
        _index: index,
        if_seq_no: 7,
        if_primary_term: 2,
        require_alias: false,
      },
    });
    expect(operations[1]).toEqual({
      [ALERT_UUID]: 'uuid-1',
      [ALERT_INSTANCE_ID]: 'instance-uuid-1',
      [ALERT_RULE_UUID]: ruleId,
      [ALERT_STATUS]: 'untracked',
      [ALERT_START]: start,
      [ALERT_END]: timestamp,
      [ALERT_TIME_RANGE]: { gte: start, lte: timestamp },
      [ALERT_TRACKED]: false,
    });
    expect(operations[2]).toEqual({ index: expect.objectContaining({ _id: 'uuid-2' }) });
    expect(logger.warn).toHaveBeenCalledWith(
      `Untracked 2 orphaned active alert document(s) ${ruleInfoMessage}`,
      logTags
    );
  });

  test('is not complete when the search returned as many documents as it can load', async () => {
    const hits = Array.from({ length: MAX_ORPHANED_ALERTS_PER_RUN }, (_, i) =>
      makeHit(`uuid-${i}`)
    );
    search.mockResolvedValue(makeSearchResult(hits));
    bulk.mockResolvedValue(makeBulkResponse(hits.map(() => undefined)));

    await expect(run()).resolves.toEqual({
      untrackedCount: MAX_ORPHANED_ALERTS_PER_RUN,
      isComplete: false,
    });
  });

  test('is not complete when some documents could not be written', async () => {
    search.mockResolvedValue(
      makeSearchResult([makeHit('uuid-1'), makeHit('uuid-2'), makeHit('uuid-3')])
    );
    bulk.mockResolvedValue(
      makeBulkResponse([
        undefined,
        'version_conflict_engine_exception',
        'version_conflict_engine_exception',
      ])
    );

    await expect(run()).resolves.toEqual({ untrackedCount: 1, isComplete: false });

    expect(logger.warn).toHaveBeenCalledWith(
      `Untracked 1 orphaned active alert document(s) ${ruleInfoMessage}`,
      logTags
    );
    expect(logger.warn).toHaveBeenCalledWith(
      `Failed to untrack 2 orphaned active alert document(s) ${ruleInfoMessage}: version_conflict_engine_exception`,
      logTags
    );
  });

  test('is not complete when a shard failed, because it may hold more orphans', async () => {
    search.mockResolvedValue(makeSearchResult([makeHit('uuid-1')], 1));
    bulk.mockResolvedValue(makeBulkResponse([undefined]));

    await expect(run()).resolves.toEqual({ untrackedCount: 1, isComplete: false });
  });

  test('skips documents in partial and restored indices without failing', async () => {
    search.mockResolvedValue(
      makeSearchResult([
        makeHit('uuid-1', { _index: `partial-${index}` }),
        makeHit('uuid-2', { _index: `restored-${index}` }),
        makeHit('uuid-3'),
      ])
    );
    bulk.mockResolvedValue(makeBulkResponse([undefined]));

    await expect(run()).resolves.toEqual({ untrackedCount: 1, isComplete: true });

    const operations = bulk.mock.calls[0][0];
    expect(operations).toHaveLength(2);
    expect(operations[0]).toEqual({ index: expect.objectContaining({ _id: 'uuid-3' }) });
    expect(logger.warn).toHaveBeenCalledWith(
      `Could not untrack orphaned alert uuid-1 in partial-${index}. Partial and restored alert indices are not supported ${ruleInfoMessage}.`,
      logTags
    );
  });

  test('does not throw and is not complete when the search fails', async () => {
    search.mockRejectedValue(new Error('search failed'));

    await expect(run()).resolves.toEqual({ untrackedCount: 0, isComplete: false });

    expect(bulk).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      `Error untracking orphaned active alert documents ${ruleInfoMessage} - search failed`,
      logTags
    );
  });

  test('does not throw and is not complete when the write fails', async () => {
    search.mockResolvedValue(makeSearchResult([makeHit('uuid-1')]));
    bulk.mockRejectedValue(new Error('bulk failed'));

    await expect(run()).resolves.toEqual({ untrackedCount: 0, isComplete: false });

    expect(logger.warn).toHaveBeenCalledWith(
      `Error untracking orphaned active alert documents ${ruleInfoMessage} - bulk failed`,
      logTags
    );
  });
});
