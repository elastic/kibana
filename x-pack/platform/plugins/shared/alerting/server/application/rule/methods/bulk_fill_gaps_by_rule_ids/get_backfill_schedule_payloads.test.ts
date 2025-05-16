/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '../../../../rules_client';
import { rulesClientContextMock } from '../../../../rules_client/rules_client.mock';
import type { Gap } from '../../../../lib/rule_gaps/gap';
import type { GetBackfillSchedulePayloadsResult } from './types';
import { findGaps } from '../find_gaps';
import { getBackfillSchedulePayloads } from './get_backfill_schedule_payloads';

jest.mock('../find_gaps', () => {
  return {
    findGaps: jest.fn(),
  };
});

const findGapsMock = findGaps as jest.Mock;

describe('getBackfillSchedulePayloads', () => {
  let context: RulesClientContext;
  let result: GetBackfillSchedulePayloadsResult;
  const backfillingDateRange = {
    start: '2025-05-09T09:15:09.457Z',
    end: '2025-05-09T09:24:09.457Z',
  };
  const createRule = (id: string, name: string) => ({ id, name, gapPagination: { page: 1 } });
  const range = (start: string, end: string) => ({ gte: start, lte: end });
  const createGap = (unfilledIntervals: Array<ReturnType<typeof range>>): Gap => {
    return {
      getState: () => ({
        unfilledIntervals,
      }),
    } as Gap;
  };

  const erroredRule = createRule('some-rule-id-4', 'rule-with-4-gaps');
  const ruledWithEmptyUnfilledIntervals = createRule('some-rule-id-3', 'rule-with-3-gaps');

  const rulesAndGaps = [
    {
      rule: createRule('some-rule-id-1', 'rule-with-1-gaps'),
      gaps: [
        createGap([
          range('2025-05-09T09:15:09.457Z', '2025-05-09T09:20:09.457Z'),
          range('2025-05-09T09:21:09.457Z', '2025-05-09T09:22:09.457Z'),
        ]),
      ],
    },
    {
      rule: createRule('some-rule-id-2', 'rule-with-2-gaps'),
      gaps: [
        createGap([
          range('2025-05-09T09:15:09.457Z', '2025-05-09T09:20:09.457Z'),
          range('2025-05-09T09:21:09.457Z', '2025-05-09T09:22:09.457Z'),
        ]),
        createGap([range('2025-05-09T09:23:09.457Z', '2025-05-09T09:24:09.457Z')]),
      ],
    },
    {
      rule: ruledWithEmptyUnfilledIntervals,
      gaps: [
        createGap(
          // No unfilled intervals
          []
        ),
      ],
    },
    {
      rule: erroredRule,
      gaps: [],
      shouldError: true,
    },
  ];

  beforeEach(async () => {
    context = rulesClientContextMock.create();

    // For each rule only return the first gap
    rulesAndGaps.forEach(({ rule, gaps, shouldError }) => {
      if (shouldError) {
        findGapsMock.mockRejectedValueOnce(new Error(`Rule ${rule.id} errored`));
        return;
      }

      findGapsMock.mockResolvedValueOnce({
        data: [gaps[0]],
        total: gaps.length,
        page: 1,
        perPage: 1,
      });
    });

    result = await getBackfillSchedulePayloads(context, {
      rules: rulesAndGaps.map(({ rule }) => rule),
      range: backfillingDateRange,
      // So we query one gap at a time per rule
      maxGapPageSize: 1,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should fetch the gaps for each rule with the right parameters', () => {
    rulesAndGaps.forEach(({ rule }, idx) => {
      const callOrder = idx + 1;
      expect(findGapsMock).toHaveBeenNthCalledWith(callOrder, context, {
        ruleId: rule.id,
        start: backfillingDateRange.start,
        end: backfillingDateRange.end,
        page: rule.gapPagination.page,
        statuses: ['partially_filled', 'unfilled'],
        perPage: 1,
        sortField: '@timestamp',
        sortOrder: 'asc',
      });
    });
  });

  it('should return the expected backfill scheduling payload', () => {
    expect(result.payloads.length).toEqual(2);
    result.payloads.forEach((payload, idx) => {
      expect(payload.ruleId).toEqual(rulesAndGaps[idx].rule.id);
      const firstGap = rulesAndGaps[idx].gaps[0];
      const expectedSchedulingRanges = firstGap.getState().unfilledIntervals.map(({ lte, gte }) => {
        return {
          start: gte,
          end: lte,
        };
      });
      expect(payload.ranges).toEqual(expectedSchedulingRanges);
    });
  });

  it('should not return a list of payloads containing a rule with an array of empty date ranges', () => {
    const payload = result.payloads.find(
      ({ ruleId }) => ruleId === ruledWithEmptyUnfilledIntervals.id
    );
    expect(payload).toBe(undefined);
  });

  it('should return an errors array with data about the rule and the error', () => {
    expect(result.errored).toHaveLength(1);
    const errored = result.errored[0];
    const { id, name } = erroredRule;
    expect(errored).toEqual({
      errorMessage: `Rule ${id} errored`,
      rule: { id, name },
      step: 'RESOLVING_GAPS',
    });
  });

  it('should return a list of rules that have more gaps than the maxGapPageSize', () => {
    expect(result.next).toEqual([
      {
        ...rulesAndGaps[1].rule,
        gapPagination: {
          page: 2,
        },
      },
    ]);
  });
});
