/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { IEventLogClient } from '@kbn/event-log-plugin/server';
import type { RulesClientContext } from '../../../rules_client/types';
import { cleanupStuckInProgressGaps } from './cleanup_stuck_in_progress_gaps';
import { Gap } from '../gap';
import { getRuleIdsWithGaps } from '../../../application/gaps/methods/get_rule_ids_with_gaps/get_rule_ids_with_gaps';
import { findGapsSearchAfter } from '../find_gaps';
import { updateGapsInEventLog } from './update_gaps_in_event_log';
import type { Logger } from '@kbn/core/server';
jest.mock('../find_gaps', () => ({
  findGapsSearchAfter: jest.fn(),
}));

jest.mock(
  '../../../application/gaps/methods/get_rule_ids_with_gaps/get_rule_ids_with_gaps',
  () => ({
    getRuleIdsWithGaps: jest.fn(),
  })
);

jest.mock('../task/utils', () => ({
  filterGapsWithOverlappingBackfills: jest.fn(async (gaps: unknown[]) => gaps),
}));

jest.mock('./update_gaps_in_event_log', () => ({
  updateGapsInEventLog: jest.fn(async ({ gaps, prepareGaps }) => {
    if (typeof prepareGaps === 'function') {
      await prepareGaps(gaps);
    }
    return true;
  }),
}));

describe('cleanupStuckInProgressGaps', () => {
  const logger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  const eventLogger = { initialize: jest.fn() } as unknown as IEventLogger;

  const eventLogClient = {
    closePointInTime: jest.fn(async () => {}),
  } as unknown as IEventLogClient;

  const rulesClientContext = {
    getActionsClient: jest.fn(async () => ({})),
    backfillClient: {},
    internalSavedObjectsRepository: {},
  } as unknown as RulesClientContext;

  const startDate = new Date('2024-01-01T00:00:00.000Z');

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('resets in_progress_intervals for gaps without overlapping backfills and updates updated_at', async () => {
    const mockedGetRuleIdsWithGaps = getRuleIdsWithGaps as jest.MockedFunction<
      typeof getRuleIdsWithGaps
    >;
    mockedGetRuleIdsWithGaps.mockResolvedValue({
      ruleIds: ['r-1', 'r-2'],
      total: 2,
      latestGapTimestamp: undefined,
    } as unknown as Awaited<ReturnType<typeof getRuleIdsWithGaps>>);

    const mkGap = (ruleId: string, id: string) => {
      const gap = new Gap({
        ruleId,
        range: { gte: '2024-01-01T01:00:00.000Z', lte: '2024-01-01T02:00:00.000Z' },
        internalFields: { _id: id, _index: 'idx', _seq_no: 1, _primary_term: 1 },
      });
      // mark part of it as in-progress
      gap.addInProgress({
        gte: new Date('2024-01-01T01:00:00.000Z'),
        lte: new Date('2024-01-01T01:30:00.000Z'),
      });
      return gap;
    };

    const gaps = [mkGap('r-1', '1'), mkGap('r-2', '2')];
    const spies = gaps.map((g) => jest.spyOn(g, 'setUpdatedAt'));

    const mockedFindGapsSearchAfter = findGapsSearchAfter as jest.MockedFunction<
      typeof findGapsSearchAfter
    >;
    mockedFindGapsSearchAfter.mockResolvedValue({
      total: 2,
      data: gaps,
      pitId: undefined,
    } as Awaited<ReturnType<typeof findGapsSearchAfter>>);

    const { filterGapsWithOverlappingBackfills } = jest.requireMock('../task/utils');
    (filterGapsWithOverlappingBackfills as jest.Mock).mockResolvedValue(gaps);

    await cleanupStuckInProgressGaps({
      rulesClientContext,
      eventLogClient,
      eventLogger,
      logger,
      startDate,
    });

    // updateGapsInEventLog should be called once per rule with gaps reset
    expect(updateGapsInEventLog).toHaveBeenCalled();
    const calls = (updateGapsInEventLog as jest.Mock).mock.calls;
    const allGapsPassed: Gap[] = calls.flatMap((c: unknown[]) => (c[0] as { gaps: Gap[] }).gaps);
    // in progress intervals cleared and updated_at set
    allGapsPassed.forEach((g) => {
      expect(g.inProgressIntervals.length).toBe(0);
    });
    spies.forEach((s) => expect(s).toHaveBeenCalled());
  });

  it('does not reset in_progress_intervals when overlapping backfills exist, but updates updated_at', async () => {
    const mockedGetRuleIdsWithGaps = getRuleIdsWithGaps as jest.MockedFunction<
      typeof getRuleIdsWithGaps
    >;
    mockedGetRuleIdsWithGaps.mockResolvedValue({
      ruleIds: ['r-1'],
      total: 1,
      latestGapTimestamp: undefined,
    } as unknown as Awaited<ReturnType<typeof getRuleIdsWithGaps>>);

    const gap = new Gap({
      ruleId: 'r-1',
      range: { gte: '2024-01-01T01:00:00.000Z', lte: '2024-01-01T02:00:00.000Z' },
      internalFields: { _id: '1', _index: 'idx', _seq_no: 1, _primary_term: 1 },
    });
    gap.addInProgress({
      gte: new Date('2024-01-01T01:00:00.000Z'),
      lte: new Date('2024-01-01T01:30:00.000Z'),
    });
    const originalInProgress = gap.inProgressIntervals.slice();
    const setUpdatedAtSpy = jest.spyOn(gap, 'setUpdatedAt');

    const mockedFindGapsSearchAfter = findGapsSearchAfter as jest.MockedFunction<
      typeof findGapsSearchAfter
    >;
    mockedFindGapsSearchAfter.mockResolvedValue({
      total: 1,
      data: [gap],
      pitId: undefined,
    } as Awaited<ReturnType<typeof findGapsSearchAfter>>);

    // Simulate that overlapping backfills exist, so no reset should occur
    const { filterGapsWithOverlappingBackfills } = jest.requireMock('../task/utils');
    (filterGapsWithOverlappingBackfills as jest.Mock).mockResolvedValueOnce([]);

    await cleanupStuckInProgressGaps({
      rulesClientContext,
      eventLogClient,
      eventLogger,
      logger,
      startDate,
    });

    expect(updateGapsInEventLog).toHaveBeenCalled();
    // in_progress should remain unchanged
    expect(gap.inProgressIntervals).toEqual(originalInProgress);
    // but updated_at should be set
    expect(setUpdatedAtSpy).toHaveBeenCalled();
  });
});
