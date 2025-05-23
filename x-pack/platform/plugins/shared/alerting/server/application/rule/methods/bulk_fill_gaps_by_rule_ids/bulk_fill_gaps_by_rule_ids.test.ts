/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientContextMock } from '../../../../rules_client/rules_client.mock';
import { bulkFillGapsByRuleIds } from './bulk_fill_gaps_by_rule_ids';
import type { BulkFillGapsByRuleIdsParams, BulkFillGapsByRuleIdsResult } from './types';
import type { RulesClientContext } from '../../../../rules_client';
import type { ScheduleBackfillParams } from '../../../backfill/methods/schedule/types';
import { getBackfillPayloadForRuleGaps } from './get_backfill_payload_for_rule_gaps';
import { scheduleBackfill } from '../../../backfill/methods/schedule';
import { RuleAuditAction, ruleAuditEvent } from '../../../../rules_client/common/audit_events';
import { RULE_SAVED_OBJECT_TYPE } from '../get_rule_ids_with_gaps/get_rule_ids_with_gaps';
import { toBulkGapFillError } from './utils';

jest.mock('./get_backfill_payload_for_rule_gaps', () => {
  return {
    getBackfillPayloadForRuleGaps: jest.fn(),
  };
});

const getBackfillPayloadForRuleGapsMock = getBackfillPayloadForRuleGaps as jest.Mock;

jest.mock('../../../backfill/methods/schedule', () => {
  return {
    scheduleBackfill: jest.fn(),
  };
});

const scheduleBackfillMock = scheduleBackfill as jest.Mock;

jest.mock('../../../../rules_client/common/audit_events', () => {
  const actual = jest.requireActual('../../../../rules_client/common/audit_events');
  return {
    ...actual,
    ruleAuditEvent: jest.fn(),
  };
});

const ruleAuditEventMock = ruleAuditEvent as jest.Mock;

const buildRule = (id: string): BulkFillGapsByRuleIdsParams['rules'][0] => {
  return {
    id,
    name: `${id}-rule-name`,
    consumer: `${id}-rule-consumer`,
    alertTypeId: `${id}-rule-alert-type-id`,
  };
};
const backfillRange = { start: '2025-05-09T09:15:09.457Z', end: '2025-05-09T09:24:09.457Z' };
const successfulRules = Array.from({ length: 3 }, (_, idx) =>
  buildRule(idx.toString())
) as BulkFillGapsByRuleIdsParams['rules'];
const successRulesOutcomes = successfulRules.map((rule) => {
  return {
    ruleId: rule.id,
    outcome: `outcome for ${rule.id}`,
  };
});
const erroredRuleAtAuthorization = buildRule('3');
const skippedRule = buildRule('4');
const erroredRuleAtGapResolution = buildRule('5');
const erroredRuleAtScheduling = buildRule('6');
const allRules = [
  ...successfulRules,
  erroredRuleAtAuthorization,
  erroredRuleAtGapResolution,
  skippedRule,
  erroredRuleAtScheduling,
];
const rulesThatCalledScheduleBackfill = [...successfulRules, erroredRuleAtScheduling];

const returnedGaps = rulesThatCalledScheduleBackfill.reduce((acc, rule) => {
  acc[rule.id] = [
    {
      id: `some-gap-for-rule-${rule.id}`,
      range: { start: '2025-05-09T09:15:09.457Z', end: '2025-05-09T09:24:09.457Z' },
    },
  ];
  return acc;
}, {} as Record<string, object>);

describe('bulkFillGapsByRuleIds', () => {
  let results: BulkFillGapsByRuleIdsResult;
  let rulesClientContext: RulesClientContext;
  let refreshIndexMock: jest.Mock;

  const authorizationError = new Error('error at authorization');
  const gapResolutionError = new Error('error at gap resolution');
  const schedulingError = new Error('error at scheduling');

  beforeEach(async () => {
    rulesClientContext = rulesClientContextMock.create();
    const eventLogClientMock = rulesClientContext.getEventLogClient as jest.Mock;
    refreshIndexMock = jest.fn();
    eventLogClientMock.mockResolvedValue({ refreshIndex: refreshIndexMock });

    const ensuredAuthorizedMock = rulesClientContext.authorization.ensureAuthorized as jest.Mock;
    ensuredAuthorizedMock.mockImplementation(async ({ ruleTypeId }) => {
      if (ruleTypeId === erroredRuleAtAuthorization.alertTypeId) {
        throw authorizationError;
      }
    });

    getBackfillPayloadForRuleGapsMock.mockImplementation(async (_, __, { ruleId }) => {
      if (ruleId === erroredRuleAtGapResolution.id) {
        throw gapResolutionError;
      }

      const payload: ScheduleBackfillParams[0] = { ruleId, ranges: [] };
      if (ruleId === skippedRule.id) {
        return {
          backfillRequestPayload: payload,
          gaps: [],
        };
      }

      payload.ranges.push(backfillRange);
      return {
        backfillRequestPayload: payload,
        gaps: returnedGaps[ruleId],
      };
    });

    scheduleBackfillMock.mockImplementation(async (_, [payload]) => {
      const ruleId = payload.ruleId;
      if (ruleId === erroredRuleAtScheduling.id) {
        throw schedulingError;
      }
      return successRulesOutcomes.filter((outcome) => outcome.ruleId === ruleId);
    });

    ruleAuditEventMock.mockImplementation((payload) => payload);

    results = await bulkFillGapsByRuleIds(rulesClientContext, {
      rules: allRules,
      range: backfillRange,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should call the scheduling function correctly', () => {
    rulesThatCalledScheduleBackfill.forEach((rule) => {
      expect(scheduleBackfillMock).toHaveBeenCalledWith(
        rulesClientContext,
        [
          {
            ruleId: rule.id,
            ranges: [backfillRange],
          },
        ],
        returnedGaps[rule.id]
      );
    });
  });

  it('should return a list with rules that succeeded', () => {
    expect(results.outcomes).toEqual(successRulesOutcomes.map((outcome) => [outcome]));
  });

  it('should log an audit event when when scheduling succeeds', () => {
    successfulRules.forEach(({ id, name }) => {
      expect(rulesClientContext.auditLogger?.log).toHaveBeenCalledWith({
        action: RuleAuditAction.FILL_GAPS,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name },
      });
    });
  });

  it('should return a list with errored rules that includes rules that failed at the scheduling step', () => {
    const erroredRule = results.errored.find(
      (errored) => errored.rule.id === erroredRuleAtScheduling.id
    );
    expect(erroredRule).toEqual(
      toBulkGapFillError(erroredRuleAtScheduling, 'BULK_GAPS_FILL_STEP_SCHEDULING', schedulingError)
    );
  });

  it('should log an audit event when the rule fails at the scheduling step', () => {
    const { id, name } = erroredRuleAtScheduling;
    expect(rulesClientContext.auditLogger?.log).toHaveBeenCalledWith({
      action: RuleAuditAction.FILL_GAPS,
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name },
      error: schedulingError,
    });
  });

  it('should return a list with rules that were skipped', () => {
    expect(results.skipped).toEqual([skippedRule]);
  });

  it('should return a list with errored rules that includes rules that failed at the authorization step', () => {
    const erroredRule = results.errored.find(
      (errored) => errored.rule.id === erroredRuleAtAuthorization.id
    );
    expect(erroredRule).toEqual(
      toBulkGapFillError(
        erroredRuleAtAuthorization,
        'BULK_GAPS_FILL_STEP_ACCESS_VALIDATION',
        authorizationError
      )
    );
  });

  it('should log an audit event when the rule fails at the authorization step', () => {
    const { id, name } = erroredRuleAtAuthorization;
    expect(rulesClientContext.auditLogger?.log).toHaveBeenCalledWith({
      action: RuleAuditAction.FILL_GAPS,
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name },
      error: authorizationError,
    });
  });

  it('should return a list with errored rules that includes rules that failed at the gaps resolution step', () => {
    const erroredRule = results.errored.find(
      (errored) => errored.rule.id === erroredRuleAtGapResolution.id
    );
    expect(erroredRule).toEqual(
      toBulkGapFillError(
        erroredRuleAtGapResolution,
        'BULK_GAPS_FILL_STEP_GAPS_RESOLUTION',
        gapResolutionError
      )
    );
  });

  it('should log an audit event when the rule fails at the gaps resolution step', () => {
    const { id, name } = erroredRuleAtGapResolution;
    expect(rulesClientContext.auditLogger?.log).toHaveBeenCalledWith({
      action: RuleAuditAction.FILL_GAPS,
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name },
      error: gapResolutionError,
    });
  });

  it('should refresh the index of the event client once after scheduling the backfilling of all gaps', () => {
    const lastSchedulingCall =
      scheduleBackfillMock.mock.invocationCallOrder[
        // We called the scheduling function one more time for the rule that failed at that step
        successfulRules.length
      ];
    expect(refreshIndexMock).toHaveBeenCalledTimes(1);
    expect(refreshIndexMock.mock.invocationCallOrder[0]).toBeGreaterThan(lastSchedulingCall);
  });
});
