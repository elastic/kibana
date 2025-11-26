/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Gap } from '../../../../lib/rule_gaps/gap';
import type { StringInterval } from '../../types/intervals';
import { scheduleBackfill } from '../../../backfill/methods/schedule';
import { rulesClientContextMock } from '../../../../rules_client/rules_client.mock';
import { processGapsBatch } from './process_gaps_batch';
import { backfillInitiator } from '../../../../../common/constants';

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
  const getRange = (gte: string, lte: string) => ({ gte, lte });
  const createGap = ({
    range,
    filledIntervals,
    ruleId = 'some-rule-id',
  }: {
    ruleId?: string;
    range: StringInterval;
    filledIntervals?: StringInterval[];
  }): Gap => {
    return new Gap({
      ruleId,
      range,
      filledIntervals,
    });
  };

  const testBatch = [
    createGap({ range: getRange('2025-05-10T09:15:09.457Z', '2025-05-11T09:15:09.457Z') }),
    createGap({ range: getRange('2025-05-12T09:15:09.457Z', '2025-05-13T09:15:09.457Z') }),
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

  const callProcessGapsBatch = async (
    batch = testBatch,
    dateRange = backfillingDateRange,
    maxGapsCountToProcess: number | undefined = undefined
  ) => {
    result = await processGapsBatch(context, {
      range: dateRange,
      gapsBatch: batch,
      maxGapsCountToProcess,
      initiator: backfillInitiator.USER,
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
            initiator: backfillInitiator.USER,
            ranges: testBatch.flatMap(getGapScheduleRange),
          },
        ],
        testBatch
      );
    });

    it('should return the right count of processed gaps', () => {
      expect(result).toEqual({
        processedGapsCount: testBatch.length,
        hasErrors: false,
        results: [
          {
            processedGaps: 2,
            ruleId: 'some-rule-id',
            status: 'success',
          },
        ],
      });
    });
  });

  describe('when there are errors backfilling gaps', () => {
    it('should propagate the error when the scheduleBackfill returns an error', async () => {
      const errorMessage = 'something went wrong when backfilling';
      scheduleBackfillMock.mockResolvedValueOnce([
        {
          error: {
            message: errorMessage,
            rule: {
              id: 'some-rule-id',
            },
          },
        },
      ]);
      await callProcessGapsBatch();

      expect(result).toEqual({
        hasErrors: true,
        processedGapsCount: 2,
        results: [
          {
            error: errorMessage,
            processedGaps: 2,
            ruleId: 'some-rule-id',
            status: 'error',
          },
        ],
      });
    });
  });

  describe('when called with an empty list of gaps', () => {
    beforeEach(async () => {
      await callProcessGapsBatch([]);
    });

    it('should not attempt to schedule backfills', () => {
      expect(scheduleBackfillMock).not.toHaveBeenCalled();
    });

    it('should return the right count of processed gaps', () => {
      expect(result).toEqual({
        processedGapsCount: 0,
        hasErrors: false,
        results: [],
      });
    });
  });

  describe('when the returned gaps are outside of the date range', () => {
    const backfillingRange = {
      start: '2025-05-10T09:15:09.457Z',
      end: '2025-05-12T09:15:09.457Z',
    };
    const gapsBatchOutsideOfRange = [
      createGap({ range: getRange('2025-05-09T09:15:09.457Z', '2025-05-11T09:15:09.457Z') }),
      createGap({ range: getRange('2025-05-11T09:15:09.457Z', '2025-05-17T09:15:09.457Z') }),
    ];
    const clampedGapsBatch = [
      createGap({ range: getRange(backfillingRange.start, '2025-05-11T09:15:09.457Z') }),
      createGap({ range: getRange('2025-05-11T09:15:09.457Z', backfillingRange.end) }),
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
            initiator: backfillInitiator.USER,
            ranges: clampedGapsBatch.flatMap(getGapScheduleRange),
          },
        ],
        gapsBatchOutsideOfRange
      );
    });

    it('should return the right count of processed gaps', () => {
      expect(result).toEqual({
        processedGapsCount: 2,
        hasErrors: false,
        results: [
          {
            ruleId: 'some-rule-id',
            processedGaps: 2,
            status: 'success',
          },
        ],
      });
    });
  });

  describe('when the unfilled intervals list is empty in all gaps', () => {
    const gapsWithEmptyUnfilledIntervals = [
      createGap({
        range: getRange('2025-05-09T09:15:09.457Z', '2025-05-11T09:15:09.457Z'),
        filledIntervals: [getRange('2025-05-09T09:15:09.457Z', '2025-05-11T09:15:09.457Z')],
      }),
    ];

    beforeEach(async () => {
      await callProcessGapsBatch(gapsWithEmptyUnfilledIntervals);
    });

    it('should not schedule any backfills', () => {
      expect(scheduleBackfillMock).not.toHaveBeenCalled();
    });

    it('should return the right count of processed gaps', () => {
      expect(result).toEqual({
        processedGapsCount: 0,
        hasErrors: false,
        results: [],
      });
    });
  });

  describe('when the caller defines a limit of how many gaps should be processed', () => {
    const backfillingRange = {
      start: '2025-05-10T09:15:09.457Z',
      end: '2025-05-15T09:15:09.457Z',
    };
    const gapsBatch = [
      createGap({ range: getRange(backfillingRange.start, '2025-05-11T09:15:09.457Z') }),
      createGap({ range: getRange('2025-05-11T09:15:10.457Z', '2025-05-12T09:15:09.457Z') }),
      createGap({ range: getRange('2025-05-13T09:15:09.457Z', backfillingRange.end) }),
    ];

    beforeEach(async () => {
      scheduleBackfillMock.mockResolvedValue([{ some: 'successful result' }]);
      await callProcessGapsBatch(gapsBatch, backfillingRange, 2);
    });

    it('should only schedule for gaps within the count limt', () => {
      const processedGaps = gapsBatch.slice(0, 2);
      expect(scheduleBackfillMock).toHaveBeenCalledTimes(1);
      expect(scheduleBackfillMock).toHaveBeenCalledWith(
        context,
        [
          {
            ruleId: rule.id,
            initiator: backfillInitiator.USER,
            ranges: processedGaps.flatMap(getGapScheduleRange),
          },
        ],
        processedGaps
      );
    });

    it('should return the right count of processed gaps', () => {
      expect(result).toEqual({
        processedGapsCount: 2,
        hasErrors: false,
        results: [
          {
            status: 'success',
            ruleId: 'some-rule-id',
            processedGaps: 2,
          },
        ],
      });
    });
  });

  describe('when processing gaps from multiple rules', () => {
    const backfillingRange = {
      start: '2025-05-10T09:15:09.457Z',
      end: '2025-05-15T09:15:09.457Z',
    };

    const multiRuleGapsBatch = [
      createGap({
        ruleId: 'rule-1',
        range: getRange('2025-05-10T09:15:09.457Z', '2025-05-11T09:15:09.457Z'),
      }),
      createGap({
        ruleId: 'rule-1',
        range: getRange('2025-05-12T09:15:09.457Z', '2025-05-13T09:15:09.457Z'),
      }),
      createGap({
        ruleId: 'rule-2',
        range: getRange('2025-05-11T09:15:09.457Z', '2025-05-12T09:15:09.457Z'),
      }),
      createGap({
        ruleId: 'rule-3',
        range: getRange('2025-05-13T09:15:09.457Z', '2025-05-14T09:15:09.457Z'),
      }),
    ];

    beforeEach(async () => {
      scheduleBackfillMock.mockResolvedValue([
        { some: 'successful result for rule-1' },
        { some: 'successful result for rule-2' },
        { some: 'successful result for rule-3' },
      ]);
      await callProcessGapsBatch(multiRuleGapsBatch, backfillingRange);
    });

    it('should create separate scheduling payloads for each rule', () => {
      expect(scheduleBackfillMock).toHaveBeenCalledTimes(1);
      expect(scheduleBackfillMock).toHaveBeenCalledWith(
        context,
        [
          {
            ruleId: 'rule-1',
            initiator: backfillInitiator.USER,
            ranges: [multiRuleGapsBatch[0], multiRuleGapsBatch[1]].flatMap(getGapScheduleRange),
          },
          {
            ruleId: 'rule-2',
            initiator: backfillInitiator.USER,
            ranges: [multiRuleGapsBatch[2]].flatMap(getGapScheduleRange),
          },
          {
            ruleId: 'rule-3',
            initiator: backfillInitiator.USER,
            ranges: [multiRuleGapsBatch[3]].flatMap(getGapScheduleRange),
          },
        ],
        multiRuleGapsBatch
      );
    });

    it('should return results grouped by rule with correct counts', () => {
      expect(result).toEqual({
        processedGapsCount: 4,
        hasErrors: false,
        results: [
          {
            ruleId: 'rule-1',
            processedGaps: 2,
            status: 'success',
          },
          {
            ruleId: 'rule-2',
            processedGaps: 1,
            status: 'success',
          },
          {
            ruleId: 'rule-3',
            processedGaps: 1,
            status: 'success',
          },
        ],
      });
    });
  });

  describe('when processing gaps from multiple rules with some failures', () => {
    const multiRuleGapsBatch = [
      createGap({
        ruleId: 'rule-success',
        range: getRange('2025-05-10T09:15:09.457Z', '2025-05-11T09:15:09.457Z'),
      }),
      createGap({
        ruleId: 'rule-error',
        range: getRange('2025-05-11T09:15:09.457Z', '2025-05-12T09:15:09.457Z'),
      }),
    ];

    beforeEach(async () => {
      scheduleBackfillMock.mockResolvedValue([
        { some: 'successful result' },
        {
          error: {
            message: 'Failed to schedule backfill for rule-error',
            rule: { id: 'rule-error' },
          },
        },
      ]);
      await callProcessGapsBatch(multiRuleGapsBatch, backfillingDateRange);
    });

    it('should return mixed success and error results', () => {
      expect(result).toEqual({
        processedGapsCount: 2,
        hasErrors: true,
        results: [
          {
            ruleId: 'rule-success',
            processedGaps: 1,
            status: 'success',
          },
          {
            ruleId: 'rule-error',
            processedGaps: 1,
            status: 'error',
            error: 'Failed to schedule backfill for rule-error',
          },
        ],
      });
    });
  });

  describe('when processing gaps from multiple rules with maxGapsCountToProcess limit', () => {
    const multiRuleGapsBatch = [
      createGap({
        ruleId: 'rule-1',
        range: getRange('2025-05-10T09:15:09.457Z', '2025-05-11T09:15:09.457Z'),
      }),
      createGap({
        ruleId: 'rule-1',
        range: getRange('2025-05-11T09:15:09.457Z', '2025-05-12T09:15:09.457Z'),
      }),
      createGap({
        ruleId: 'rule-2',
        range: getRange('2025-05-12T09:15:09.457Z', '2025-05-13T09:15:09.457Z'),
      }),
      createGap({
        ruleId: 'rule-2',
        range: getRange('2025-05-13T09:15:09.457Z', '2025-05-14T09:15:09.457Z'),
      }),
      createGap({
        ruleId: 'rule-3',
        range: getRange('2025-05-14T09:15:09.457Z', '2025-05-15T09:15:09.457Z'),
      }),
    ];

    beforeEach(async () => {
      scheduleBackfillMock.mockResolvedValue([
        { some: 'successful result for rule-1' },
        { some: 'successful result for rule-2' },
      ]);
      // Limit to 3 gaps - should process rule-1 (2 gaps) and rule-2 (1 gap), but not rule-3
      await callProcessGapsBatch(multiRuleGapsBatch, backfillingDateRange, 3);
    });

    it('should respect the maxGapsCountToProcess limit across all rules', () => {
      expect(scheduleBackfillMock).toHaveBeenCalledTimes(1);
      expect(scheduleBackfillMock).toHaveBeenCalledWith(
        context,
        [
          {
            ruleId: 'rule-1',
            initiator: backfillInitiator.USER,
            ranges: [multiRuleGapsBatch[0], multiRuleGapsBatch[1]].flatMap(getGapScheduleRange),
          },
          {
            ruleId: 'rule-2',
            initiator: backfillInitiator.USER,
            ranges: [multiRuleGapsBatch[2]].flatMap(getGapScheduleRange),
          },
        ],
        multiRuleGapsBatch.slice(0, 3)
      );
    });

    it('should return results only for processed rules', () => {
      expect(result).toEqual({
        processedGapsCount: 3,
        hasErrors: false,
        results: [
          {
            ruleId: 'rule-1',
            processedGaps: 2,
            status: 'success',
          },
          {
            ruleId: 'rule-2',
            processedGaps: 1,
            status: 'success',
          },
        ],
      });
    });
  });

  describe('initiatorId forwarding', () => {
    it('forwards initiatorId to scheduleBackfill for single-rule batches', async () => {
      scheduleBackfillMock.mockResolvedValue([{ some: 'successful result' }]);
      const initiatorId = 'user-123';

      await processGapsBatch(context, {
        range: backfillingDateRange,
        gapsBatch: testBatch,
        initiator: backfillInitiator.SYSTEM,
        initiatorId,
      });

      expect(scheduleBackfillMock).toHaveBeenCalledTimes(1);
      expect(scheduleBackfillMock).toHaveBeenCalledWith(
        context,
        [
          {
            ruleId: 'some-rule-id',
            initiator: backfillInitiator.SYSTEM,
            initiatorId,
            ranges: testBatch.flatMap(getGapScheduleRange),
          },
        ],
        testBatch
      );
    });

    it('omits initiatorId when not provided', async () => {
      scheduleBackfillMock.mockResolvedValue([{ some: 'successful result' }]);
      await processGapsBatch(context, {
        range: backfillingDateRange,
        gapsBatch: testBatch,
        initiator: backfillInitiator.USER,
      });

      const payloads = scheduleBackfillMock.mock.calls[0][1];
      expect(payloads[0]).not.toHaveProperty('initiatorId');
    });

    it('adds initiatorId to all per-rule payloads for multi-rule batches', async () => {
      const multiRuleGapsBatch = [
        createGap({
          ruleId: 'rule-1',
          range: getRange('2025-05-10T09:15:09.457Z', '2025-05-11T09:15:09.457Z'),
        }),
        createGap({
          ruleId: 'rule-2',
          range: getRange('2025-05-11T09:15:09.457Z', '2025-05-12T09:15:09.457Z'),
        }),
      ];

      scheduleBackfillMock.mockResolvedValue([
        { some: 'successful result for rule-1' },
        { some: 'successful result for rule-2' },
      ]);

      const initiatorId = 'service-abc';
      await processGapsBatch(context, {
        range: backfillingDateRange,
        gapsBatch: multiRuleGapsBatch,
        initiator: backfillInitiator.SYSTEM,
        initiatorId,
      });

      expect(scheduleBackfillMock).toHaveBeenCalledTimes(1);
      expect(scheduleBackfillMock).toHaveBeenCalledWith(
        context,
        [
          {
            ruleId: 'rule-1',
            initiator: backfillInitiator.SYSTEM,
            initiatorId,
            ranges: [multiRuleGapsBatch[0]].flatMap(getGapScheduleRange),
          },
          {
            ruleId: 'rule-2',
            initiator: backfillInitiator.SYSTEM,
            initiatorId,
            ranges: [multiRuleGapsBatch[1]].flatMap(getGapScheduleRange),
          },
        ],
        multiRuleGapsBatch
      );
    });
  });
});
