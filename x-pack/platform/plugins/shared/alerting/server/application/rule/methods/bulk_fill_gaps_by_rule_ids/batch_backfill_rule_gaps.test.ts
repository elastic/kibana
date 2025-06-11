/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Gap } from '../../../../lib/rule_gaps/gap';
import { processAllGapsInTimeRange } from '../../../../lib/rule_gaps/process_all_gaps_in_time_range';
import { batchBackfillRuleGaps } from './batch_backfill_rule_gaps';
import { scheduleBackfill } from '../../../backfill/methods/schedule';
import { rulesClientContextMock } from '../../../../rules_client/rules_client.mock';
import type { BulkGapFillError } from './utils';

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

const scheduleBackfillMock = scheduleBackfill as jest.Mock;

describe('batchBackfillRuleGaps', () => {
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

  const gapsBatches = [
    [
      createGap([range('2025-05-10T09:15:09.457Z', '2025-05-11T09:15:09.457Z')]),
      createGap([range('2025-05-12T09:15:09.457Z', '2025-05-13T09:15:09.457Z')]),
    ],
    [createGap([range('2025-05-13T09:15:09.457Z', '2025-05-14T09:15:09.457Z')])],
  ];

  const getGapScheduleRange = (gap: Gap) => {
    return gap.unfilledIntervals.map(({ gte, lte }) => ({
      start: gte.toISOString(),
      end: lte.toISOString(),
    }));
  };

  let result: Awaited<ReturnType<typeof batchBackfillRuleGaps>>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const callBatchBackfillRuleGaps = async () => {
    result = await batchBackfillRuleGaps(context, {
      rule,
      range: backfillingDateRange,
    });
  };

  describe('when there are gaps to backfill', () => {
    beforeEach(async () => {
      processAllGapsInTimeRangeMock.mockImplementation(async ({ processGapsBatch }) => {
        for (const batch of gapsBatches) {
          await processGapsBatch(batch);
        }
      });
      scheduleBackfillMock.mockResolvedValue([{ some: 'successful result' }]);
      await callBatchBackfillRuleGaps();
    });

    it('should trigger the batch fetching of the gaps of the rule correctly', () => {
      expect(processAllGapsInTimeRangeMock).toHaveBeenCalledTimes(1);
      expect(processAllGapsInTimeRangeMock).toHaveBeenCalledWith({
        logger: context.logger,
        options: {
          maxFetchedGaps: 1000,
        },
        processGapsBatch: expect.any(Function),
        ruleId: rule.id,
        ...backfillingDateRange,
      });
    });

    it('should trigger the backfilling of each fetched gap batch', () => {
      expect(scheduleBackfillMock).toHaveBeenCalledTimes(2);
      expect(scheduleBackfillMock).toHaveBeenNthCalledWith(
        1,
        context,
        [
          {
            ruleId: rule.id,
            ranges: gapsBatches[0].flatMap(getGapScheduleRange),
          },
        ],
        gapsBatches[0]
      );
      expect(scheduleBackfillMock).toHaveBeenNthCalledWith(
        2,
        context,
        [
          {
            ruleId: rule.id,
            ranges: gapsBatches[1].flatMap(getGapScheduleRange),
          },
        ],
        gapsBatches[1]
      );
    });

    it('should return a successful outcome', () => {
      expect(result.outcome).toEqual('backfilled');
    });
  });

  describe('when there are errors backfilling gaps', () => {
    beforeEach(() => {
      processAllGapsInTimeRangeMock.mockImplementation(({ processGapsBatch }) => {
        return processGapsBatch(gapsBatches[0]);
      });
    });
    const getErrorFromResult = () => {
      return (result as { outcome: string; error: BulkGapFillError }).error;
    };

    it('should propagate the error when processAllGapsInTimeRange errors', async () => {
      processAllGapsInTimeRangeMock.mockRejectedValueOnce(
        new Error('processAllGapsInTimeRange failed')
      );
      await callBatchBackfillRuleGaps();

      expect(result.outcome).toEqual('errored');
      expect(getErrorFromResult()).toEqual({
        errorMessage: 'processAllGapsInTimeRange failed',
        rule,
        step: 'BULK_GAPS_FILL_STEP_SCHEDULING',
      });
    });

    it('should propagate the error when the scheduleBackfill returns an unexpected amount of results', async () => {
      scheduleBackfillMock.mockResolvedValueOnce([
        { some: 'result' },
        { some: 'other unexpected result' },
      ]);
      await callBatchBackfillRuleGaps();
      expect(result.outcome).toEqual('errored');
      expect(getErrorFromResult()).toEqual({
        errorMessage: 'Unexpected scheduling result count 2',
        rule,
        step: 'BULK_GAPS_FILL_STEP_SCHEDULING',
      });
    });

    it('should propagate the error when the scheduleBackfill returns an error', async () => {
      scheduleBackfillMock.mockResolvedValueOnce([
        {
          error: {
            message: 'something went wrong when backfilling',
          },
        },
      ]);
      await callBatchBackfillRuleGaps();
      expect(result.outcome).toEqual('errored');
      expect(getErrorFromResult()).toEqual({
        errorMessage: 'something went wrong when backfilling',
        rule,
        step: 'BULK_GAPS_FILL_STEP_SCHEDULING',
      });
    });
  });

  describe('when there is nothing to backfill', () => {
    beforeEach(async () => {
      processAllGapsInTimeRangeMock.mockImplementation(async ({ processGapsBatch }) => {
        for (let idx = 0; idx < 2; idx++) {
          await processGapsBatch([]);
        }
      });
      await callBatchBackfillRuleGaps();
    });

    it('should return a result indicating that backfilling was skipped for this rule', () => {
      expect(result.outcome).toEqual('skipped');
    });
  });
});
