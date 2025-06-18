/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Gap } from '../../../../lib/rule_gaps/gap';
import { processAllGapsInTimeRange } from '../../../../lib/rule_gaps/process_all_gaps_in_time_range';
import { batchBackfillRuleGaps } from './batch_backfill_rule_gaps';
import { rulesClientContextMock } from '../../../../rules_client/rules_client.mock';
import type { BulkGapFillError } from './utils';
import { BulkFillGapsScheduleResult, BulkGapsFillStep } from './types';
import { processGapsBatch } from './process_gaps_batch';

jest.mock('./process_gaps_batch', () => {
  return {
    processGapsBatch: jest.fn(),
  };
});

const processGapsBatchMock = processGapsBatch as jest.Mock;

jest.mock('../../../../lib/rule_gaps/process_all_gaps_in_time_range', () => {
  return {
    processAllGapsInTimeRange: jest.fn(),
  };
});

const processAllGapsInTimeRangeMock = processAllGapsInTimeRange as jest.Mock;

jest.mock('../../../backfill/methods/schedule', () => {
  return {
    scheduleBackfill: jest.fn(),
  };
});

describe('batchBackfillRuleGaps', () => {
  const context = rulesClientContextMock.create();
  const currentLogger = context.logger;
  (context.logger.get as jest.Mock).mockImplementation(() => currentLogger);
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

  const gapsBatches = [
    [
      createGap([range('2025-05-10T09:15:09.457Z', '2025-05-11T09:15:09.457Z')]),
      createGap([range('2025-05-12T09:15:09.457Z', '2025-05-13T09:15:09.457Z')]),
    ],
    [createGap([range('2025-05-13T09:15:09.457Z', '2025-05-14T09:15:09.457Z')])],
  ];

  let result: Awaited<ReturnType<typeof batchBackfillRuleGaps>>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const callBatchBackfillRuleGaps = async () => {
    result = await batchBackfillRuleGaps(context, {
      rule,
      range: backfillingDateRange,
      maxGapCountPerRule: 1000,
    });
  };

  beforeEach(() => {
    processGapsBatchMock.mockResolvedValue(true);
    processAllGapsInTimeRangeMock.mockImplementation(async ({ processGapsBatch: processFn }) => {
      const results: Awaited<ReturnType<typeof processFn>> = [];
      for (const batch of gapsBatches) {
        results.push(await processFn(batch));
      }

      return results;
    });
  });

  describe('when there are gaps to backfill', () => {
    beforeEach(async () => {
      await callBatchBackfillRuleGaps();
    });

    it('should trigger the batch fetching of the gaps of the rule correctly', () => {
      expect(processAllGapsInTimeRangeMock).toHaveBeenCalledTimes(1);
      expect(processAllGapsInTimeRangeMock).toHaveBeenCalledWith({
        logger: context.logger.get('gaps'),
        options: {
          maxFetchedGaps: 1000,
        },
        processGapsBatch: expect.any(Function),
        ruleId: rule.id,
        ...backfillingDateRange,
      });
    });

    it('should call processGapsBatch for each fetched gap batch', () => {
      expect(processGapsBatchMock).toHaveBeenCalledTimes(gapsBatches.length);
      gapsBatches.forEach((batch, idx) => {
        const callOrder = idx + 1;
        expect(processGapsBatchMock).toHaveBeenNthCalledWith(callOrder, context, {
          rule,
          range: backfillingDateRange,
          gapsBatch: batch,
        });
      });
    });

    it('should return a successful outcome', () => {
      expect(result.outcome).toEqual(BulkFillGapsScheduleResult.BACKFILLED);
    });
  });

  describe('when there are errors processing gaps', () => {
    const getErrorFromResult = () => {
      return (result as { outcome: string; error: BulkGapFillError }).error;
    };

    it('should propagate the error when processAllGapsInTimeRange errors', async () => {
      processAllGapsInTimeRangeMock.mockRejectedValueOnce(
        new Error('processAllGapsInTimeRange failed')
      );
      await callBatchBackfillRuleGaps();

      expect(result.outcome).toEqual(BulkFillGapsScheduleResult.ERRORED);
      expect(getErrorFromResult()).toEqual({
        errorMessage: 'processAllGapsInTimeRange failed',
        rule,
        step: BulkGapsFillStep.SCHEDULING,
      });
    });

    it('should propagate the error when the processGapsBatch returns an error', async () => {
      const errorMessage = 'error when calling processGapsBatch';
      processGapsBatchMock.mockRejectedValueOnce(new Error(errorMessage));
      await callBatchBackfillRuleGaps();
      expect(result.outcome).toEqual(BulkFillGapsScheduleResult.ERRORED);
      expect(getErrorFromResult()).toEqual({
        errorMessage,
        rule,
        step: BulkGapsFillStep.SCHEDULING,
      });
    });
  });

  describe('when there is nothing to backfill', () => {
    beforeEach(async () => {
      processGapsBatchMock.mockResolvedValue(false);
      await callBatchBackfillRuleGaps();
    });

    it('should return a result indicating that backfilling was skipped for this rule', () => {
      expect(result.outcome).toEqual(BulkFillGapsScheduleResult.SKIPPED);
    });
  });
});
