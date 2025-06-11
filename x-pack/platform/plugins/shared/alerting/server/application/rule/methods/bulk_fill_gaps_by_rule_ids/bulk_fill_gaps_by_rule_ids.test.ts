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
import { batchBackfillRuleGaps } from './batch_backfill_rule_gaps';
import { RuleAuditAction, ruleAuditEvent } from '../../../../rules_client/common/audit_events';
import { RULE_SAVED_OBJECT_TYPE } from '../get_rule_ids_with_gaps/get_rule_ids_with_gaps';
import { toBulkGapFillError } from './utils';

jest.mock('./batch_backfill_rule_gaps', () => {
  return {
    batchBackfillRuleGaps: jest.fn(),
  };
});

const batchBackfillRuleGapsMock = batchBackfillRuleGaps as jest.Mock;

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
const erroredRuleAtAuthorization = buildRule('3');
const skippedRule = buildRule('4');
const errroredRuleAtBackfilling = buildRule('6');
const allRules = [
  ...successfulRules,
  erroredRuleAtAuthorization,
  skippedRule,
  errroredRuleAtBackfilling,
];
const rulesThatAttemptedToBackfill = [...successfulRules, skippedRule, errroredRuleAtBackfilling];

let rulesClientContext: RulesClientContext;

describe('bulkFillGapsByRuleIds', () => {
  let refreshIndexMock: jest.Mock;
  let results: BulkFillGapsByRuleIdsResult;

  const authorizationError = new Error('error at authorization');
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

    batchBackfillRuleGapsMock.mockImplementation(async (_, { rule: { id: ruleId } }) => {
      if (ruleId === skippedRule.id) {
        return {
          outcome: 'skipped',
        };
      }

      if (ruleId === errroredRuleAtBackfilling.id) {
        return {
          outcome: 'errored',
          error: toBulkGapFillError(
            errroredRuleAtBackfilling,
            'BULK_GAPS_FILL_STEP_SCHEDULING',
            schedulingError
          ),
        };
      }

      return {
        outcome: 'backfilled',
      };
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
    rulesThatAttemptedToBackfill.forEach((rule, idx) => {
      const callOrder = idx + 1;
      expect(batchBackfillRuleGapsMock).toHaveBeenNthCalledWith(callOrder, rulesClientContext, {
        rule,
        range: backfillRange,
      });
    });
  });

  it('should return a list with rules that succeeded', () => {
    expect(results.backfilled).toEqual(successfulRules);
  });

  it('should return a list with errored rules', () => {
    expect(results.errored).toEqual([
      toBulkGapFillError(
        erroredRuleAtAuthorization,
        'BULK_GAPS_FILL_STEP_ACCESS_VALIDATION',
        authorizationError
      ),
      toBulkGapFillError(
        errroredRuleAtBackfilling,
        'BULK_GAPS_FILL_STEP_SCHEDULING',
        schedulingError
      ),
    ]);
  });

  it('should return a list with rules that were skipped', () => {
    expect(results.skipped).toEqual([skippedRule]);
  });

  it('should log an audit event when the rule fails at the authorization step', () => {
    const { id, name } = erroredRuleAtAuthorization;
    expect(rulesClientContext.auditLogger?.log).toHaveBeenCalledWith({
      action: RuleAuditAction.FILL_GAPS,
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name },
      error: authorizationError,
    });
  });

  it('should refresh the index of the event client once after scheduling the backfilling of all gaps', () => {
    expect(refreshIndexMock).toHaveBeenCalledTimes(1);
  });
});

describe('validation', () => {
  beforeEach(() => {
    rulesClientContext = rulesClientContextMock.create();
  });

  const getCallBulkFillGaps = (range: { start: string; end: string }) => () =>
    bulkFillGapsByRuleIds(rulesClientContext, { rules: [], range });

  it('should throw an error if the start date is in the future', async () => {
    const start = new Date(Date.now() + 1).toISOString();
    await expect(getCallBulkFillGaps({ start, end: new Date().toISOString() })).rejects.toThrow();
  });
  it('should throw an error if the end date is in the future', async () => {
    const end = new Date(Date.now() + 1).toISOString();
    await expect(
      getCallBulkFillGaps({ start: new Date(Date.now() - 1).toISOString(), end })
    ).rejects.toThrow();
  });
  it('should throw an error if there is not at least 5 minutes before the start and end dates', async () => {
    await expect(
      getCallBulkFillGaps({
        start: new Date(Date.now() - 1000).toISOString(),
        end: new Date().toISOString(),
      })
    ).rejects.toThrow();
  });
  it('should throw an error if there are more than 90 days between the start and end dates', async () => {
    await expect(
      getCallBulkFillGaps({
        start: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      })
    ).rejects.toThrow();
  });
});
