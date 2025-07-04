/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Gap } from '../../../../lib/rule_gaps/gap';
import { scheduleBackfill } from '../../../backfill/methods/schedule';
import { rulesClientContextMock } from '../../../../rules_client/rules_client.mock';
import { processGapsBatch } from './process_gaps_batch';

jest.mock('../../../backfill/methods/schedule', () => {
  return {
    scheduleBackfill: jest.fn(),
  };
});

const scheduleBackfillMock = scheduleBackfill as jest.Mock;

describe('processGapsBatch', () => {
  const context = rulesClientContextMock.create();
  const rule = { id: 'some-rule-id', name: 'some-rule-name' };
  const backfillingDateRange = {
    start: '2025-05-09T09:15:09.457Z',
    end: '2025-05-20T09:24:09.457Z',
  };
  const range = (start: string, end: string) => ({ gte: new Date(start), lte: new Date(end) });
  const createGap = (unfilledIntervals: Array<ReturnType<typeof range>>): Gap => {
    return {
      unfilledIntervals,
    } as unknown as Gap;
  };

  const testBatch = [
    createGap([range('2025-05-10T09:15:09.457Z', '2025-05-11T09:15:09.457Z')]),
    createGap([range('2025-05-12T09:15:09.457Z', '2025-05-13T09:15:09.457Z')]),
  ];

  const getGapScheduleRange = (gap: Gap) => {
    return gap.unfilledIntervals.map(({ gte, lte }) => ({
      start: gte.toISOString(),
      end: lte.toISOString(),
    }));
  };

  let result: Awaited<ReturnType<typeof processGapsBatch>>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const callProcessGapsBatch = async (batch = testBatch, dateRange = backfillingDateRange) => {
    result = await processGapsBatch(context, {
      rule,
      range: dateRange,
      gapsBatch: batch,
    });
  };

  describe('when there are gaps to backfill', () => {
    beforeEach(async () => {
      scheduleBackfillMock.mockResolvedValue([{ some: 'successful result' }]);
      await callProcessGapsBatch();
    });

    it('should trigger the backfilling of each fetched gap batch', () => {
      expect(scheduleBackfillMock).toHaveBeenCalledTimes(1);
      expect(scheduleBackfillMock).toHaveBeenCalledWith(
        context,
        [
          {
            ruleId: rule.id,
            ranges: testBatch.flatMap(getGapScheduleRange),
          },
        ],
        testBatch
      );
    });

    it('should return true if it schedules a backfill', () => {
      expect(result).toBe(true);
    });
  });

  describe('when there are errors backfilling gaps', () => {
    it('should propagate the error when the scheduleBackfill returns an unexpected amount of results', async () => {
      scheduleBackfillMock.mockResolvedValueOnce([
        { some: 'result' },
        { some: 'other unexpected result' },
      ]);
      await expect(callProcessGapsBatch()).rejects.toEqual(
        new Error('Unexpected scheduling result count 2')
      );
    });

    it('should propagate the error when the scheduleBackfill returns an error', async () => {
      const errorMessage = 'something went wrong when backfilling';
      scheduleBackfillMock.mockResolvedValueOnce([
        {
          error: {
            message: errorMessage,
          },
        },
      ]);
      await expect(callProcessGapsBatch()).rejects.toEqual(new Error(errorMessage));
    });
  });

  describe('when called with an empty list of gaps', () => {
    beforeEach(async () => {
      await callProcessGapsBatch([]);
    });

    it('should not attempt to schedule backfills', () => {
      expect(scheduleBackfillMock).not.toHaveBeenCalled();
    });

    it('should return false', () => {
      expect(result).toBe(false);
    });
  });

  describe('when the returned gaps are outside of the date range', () => {
    const backfillingRange = {
      start: '2025-05-10T09:15:09.457Z',
      end: '2025-05-12T09:15:09.457Z',
    };
    const gapsBatchOutsideOfRange = [
      createGap([range('2025-05-09T09:15:09.457Z', '2025-05-11T09:15:09.457Z')]),
      createGap([range('2025-05-11T09:15:09.457Z', '2025-05-17T09:15:09.457Z')]),
    ];
    const clampedGapsBatch = [
      createGap([range(backfillingRange.start, '2025-05-11T09:15:09.457Z')]),
      createGap([range('2025-05-11T09:15:09.457Z', backfillingRange.end)]),
    ];
    beforeEach(async () => {
      scheduleBackfillMock.mockResolvedValue([{ some: 'successful result' }]);
      await callProcessGapsBatch(gapsBatchOutsideOfRange, backfillingRange);
    });

    it('should only schedule for gaps within the given time range', () => {
      expect(scheduleBackfillMock).toHaveBeenCalledTimes(1);
      expect(scheduleBackfillMock).toHaveBeenCalledWith(
        context,
        [
          {
            ruleId: rule.id,
            ranges: clampedGapsBatch.flatMap(getGapScheduleRange),
          },
        ],
        gapsBatchOutsideOfRange
      );
    });
  });

  describe('when the unfilled intervals list is empty in all gaps', () => {
    const gapsWithEmptyUnfilledIntervals = [createGap([]), createGap([])];

    beforeEach(async () => {
      await callProcessGapsBatch(gapsWithEmptyUnfilledIntervals);
    });

    it('should only schedule for gaps within the range', () => {
      expect(scheduleBackfillMock).not.toHaveBeenCalled();
    });
  });
});
