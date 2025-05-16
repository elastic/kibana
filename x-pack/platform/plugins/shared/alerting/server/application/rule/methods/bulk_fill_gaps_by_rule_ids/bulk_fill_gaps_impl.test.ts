/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '../../../../rules_client';
import { rulesClientContextMock } from '../../../../rules_client/rules_client.mock';
import { getBackfillSchedulePayloads } from './get_backfill_schedule_payloads';
import { scheduleBackfill } from '../../../backfill/methods/schedule';
import type { ScheduleBackfillResults } from '../../../backfill/methods/schedule/types';
import { bulkFillGapsImpl } from './bulk_fill_gaps_impl';
import type {
  BulkGapFillingErroredRule,
  BulkFillGapsByRuleIdsParams,
  BulkGapFillingSkippedRule,
  BulkGapsFillStep,
} from './types';

jest.mock('./get_backfill_schedule_payloads', () => {
  return {
    getBackfillSchedulePayloads: jest.fn(),
  };
});

const getBackfillSchedulePayloadsMock = getBackfillSchedulePayloads as jest.Mock;

jest.mock('../../../backfill/methods/schedule', () => {
  return {
    scheduleBackfill: jest.fn(),
  };
});

const scheduleBackfillMock = scheduleBackfill as jest.Mock;

interface TestRule {
  id: string;
  name: string;
}

describe('bulkFillGapsImpl', () => {
  let rulesClientContext: RulesClientContext;
  const ruleScheduledOnce = {
    id: 'rule-id-1',
    name: 'my-rule-1',
  };
  const ruleScheduledTwice = {
    id: 'rule-id-2',
    name: 'my-rule-2',
  };
  const ruleScheduledThriceFailsLastScheduling = {
    id: 'rule-id-3',
    name: 'my-rule-3',
  };
  const ruleSkipped = {
    id: 'rule-id-4',
    name: 'my-rule-4',
  };
  const ruleFailsResolvingGaps = {
    id: 'rule-id-5',
    name: 'my-rule-5',
  };

  const rules = [
    ruleSkipped,
    ruleFailsResolvingGaps,
    ruleScheduledOnce,
    ruleScheduledTwice,
    ruleScheduledThriceFailsLastScheduling,
  ] as BulkFillGapsByRuleIdsParams['rules'];

  const range = { start: '2025-05-09T09:15:09.457Z', end: '2025-05-09T09:24:09.457Z' };

  const withPagination = (obj: object, page = 1) => ({ ...obj, gapPagination: { page } });
  const toErroredRule = (rule: TestRule, step: BulkGapsFillStep): BulkGapFillingErroredRule => {
    return {
      rule,
      step,
      errorMessage: `Error ${step}`,
    };
  };
  const toSchedulePayload = (rule: TestRule) => ({ ruleId: rule.id, more: 'data' });

  const toScheduledRuleOutcome = (rule: TestRule) => ({
    ruleId: rule.id,
    status: 'pending',
    backfillId: 'blah',
    backfillRuns: [],
  });

  const payloadToScheduleRun1 = [
    ruleScheduledOnce,
    ruleScheduledTwice,
    ruleScheduledThriceFailsLastScheduling,
  ].map(toSchedulePayload);
  const payloadToScheduleRun2: never[] = []; // Nothing to schedule the second time
  const payloadToScheduleRun3 = [toSchedulePayload(ruleScheduledThriceFailsLastScheduling)];

  const schedulingResults1 = [
    ruleScheduledOnce,
    ruleScheduledTwice,
    ruleScheduledThriceFailsLastScheduling,
  ].map(toScheduledRuleOutcome);

  let totalOutcomes: ScheduleBackfillResults[];
  let skippedRules: BulkGapFillingSkippedRule[];
  let erroredRules: BulkGapFillingErroredRule[];

  beforeEach(async () => {
    rulesClientContext = rulesClientContextMock.create();

    getBackfillSchedulePayloadsMock.mockResolvedValueOnce({
      payloads: payloadToScheduleRun1,
      next: [
        withPagination(ruleScheduledTwice, 2),
        withPagination(ruleScheduledThriceFailsLastScheduling, 2),
      ],
      errored: [toErroredRule(ruleFailsResolvingGaps, 'RESOLVING_GAPS')],
    });

    getBackfillSchedulePayloadsMock.mockResolvedValueOnce({
      payloads: payloadToScheduleRun2,
      next: [withPagination(ruleScheduledThriceFailsLastScheduling, 3)],
      errored: [],
    });

    getBackfillSchedulePayloadsMock.mockResolvedValueOnce({
      payloads: payloadToScheduleRun3,
      next: [],
      errored: [],
    });

    scheduleBackfillMock.mockResolvedValueOnce(schedulingResults1);
    scheduleBackfillMock.mockRejectedValue(new Error('Error SCHEDULING'));

    const { outcomes, skipped, errored } = await bulkFillGapsImpl(rulesClientContext, {
      rules,
      range,
    });
    totalOutcomes = outcomes;
    skippedRules = skipped;
    erroredRules = errored;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should fetch the backfill scheduling payloads for the rules', () => {
    expect(getBackfillSchedulePayloadsMock).toHaveBeenCalledTimes(3);
    expect(getBackfillSchedulePayloadsMock).toHaveBeenNthCalledWith(1, rulesClientContext, {
      rules: rules.map((rule) => withPagination(rule)),
      maxGapPageSize: 100,
      range,
    });

    expect(getBackfillSchedulePayloadsMock).toHaveBeenNthCalledWith(2, rulesClientContext, {
      rules: [
        withPagination(ruleScheduledTwice, 2),
        withPagination(ruleScheduledThriceFailsLastScheduling, 2),
      ],
      maxGapPageSize: 100,
      range,
    });

    expect(getBackfillSchedulePayloadsMock).toHaveBeenNthCalledWith(3, rulesClientContext, {
      rules: [withPagination(ruleScheduledThriceFailsLastScheduling, 3)],
      maxGapPageSize: 100,
      range,
    });
  });

  it('should attempt to schedule the backfill payloads', () => {
    // Originally we have 3 payloads to schedule, but the second payload is empty, so the second call to scheduleBackfill is skipped
    expect(scheduleBackfillMock).toHaveBeenCalledTimes(2);
    expect(scheduleBackfillMock).toHaveBeenNthCalledWith(
      1,
      rulesClientContext,
      payloadToScheduleRun1
    );
    expect(scheduleBackfillMock).toHaveBeenNthCalledWith(
      2,
      rulesClientContext,
      payloadToScheduleRun3
    );
  });

  it('should return the scheduling outcomes', () => {
    expect(totalOutcomes).toEqual([schedulingResults1]);
  });

  it('should return a list of the rules that were skipped', () => {
    expect(skippedRules).toHaveLength(1);
    expect(skippedRules).toEqual([ruleSkipped]);
  });

  it('should return any errors that occurred', () => {
    expect(erroredRules).toEqual([
      toErroredRule(ruleFailsResolvingGaps, 'RESOLVING_GAPS'),
      toErroredRule(ruleScheduledThriceFailsLastScheduling, 'SCHEDULING'),
    ]);
  });
});
