/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientContextMock } from '../../../../rules_client/rules_client.mock';
import { bulkFillGapsByRuleIds } from './bulk_fill_gaps_by_rule_ids';
import {
  BulkGapsFillStep,
  type BulkFillGapsByRuleIdsParams,
  type BulkFillGapsByRuleIdsResult,
  BulkFillGapsScheduleResult,
} from './types';
import type { RulesClientContext } from '../../../../rules_client';
import { batchBackfillRuleGaps } from './batch_backfill_rule_gaps';
import { RuleAuditAction, ruleAuditEvent } from '../../../../rules_client/common/audit_events';
import { RULE_SAVED_OBJECT_TYPE } from '../get_rule_ids_with_gaps/get_rule_ids_with_gaps';
import { toBulkGapFillError } from './utils';
import { AlertingAuthorizationEntity, WriteOperations } from '../../../../authorization';

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

const buildRule = (id: number): BulkFillGapsByRuleIdsParams['rules'][0] => {
  return {
    id: id.toString(),
    name: `${id}-rule-name`,
    consumer: `rule-consumer-${id % 2}`,
    alertTypeId: `rule-alert-type-id-${id % 2}`,
  };
};
const now = new Date();
const backfillRange = {
  start: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
  end: now.toISOString(),
}; // 10 minutes range
const successfulRules = Array.from({ length: 3 }, (_, idx) =>
  buildRule(idx)
) as BulkFillGapsByRuleIdsParams['rules'];
const erroredRuleAtAuthorization = buildRule(3);
erroredRuleAtAuthorization.alertTypeId = 'should-break';
erroredRuleAtAuthorization.consumer = 'should-break';
const skippedRule = buildRule(4);
const erroredRuleAtBackfilling = buildRule(5);
const allRules = [
  ...successfulRules,
  erroredRuleAtAuthorization,
  skippedRule,
  erroredRuleAtBackfilling,
];
const rulesThatAttemptedToBackfill = [...successfulRules, skippedRule, erroredRuleAtBackfilling];

let rulesClientContext: RulesClientContext;

describe('bulkFillGapsByRuleIds', () => {
  let refreshIndexMock: jest.Mock;
  let results: BulkFillGapsByRuleIdsResult;
  let ensuredAuthorizedMock: jest.Mock;

  const authorizationError = new Error('error at authorization');
  const schedulingError = new Error('error at scheduling');

  beforeEach(async () => {
    rulesClientContext = rulesClientContextMock.create();
    const eventLogClientMock = rulesClientContext.getEventLogClient as jest.Mock;
    refreshIndexMock = jest.fn();
    eventLogClientMock.mockResolvedValue({ refreshIndex: refreshIndexMock });

    ensuredAuthorizedMock = rulesClientContext.authorization.ensureAuthorized as jest.Mock;
    ensuredAuthorizedMock.mockImplementation(async ({ ruleTypeId }) => {
      if (ruleTypeId === erroredRuleAtAuthorization.alertTypeId) {
        throw authorizationError;
      }
    });

    batchBackfillRuleGapsMock.mockImplementation(async (_, { rule: { id: ruleId } }) => {
      if (ruleId === skippedRule.id) {
        return {
          outcome: BulkFillGapsScheduleResult.SKIPPED,
        };
      }

      if (ruleId === erroredRuleAtBackfilling.id) {
        return {
          outcome: BulkFillGapsScheduleResult.ERRORED,
          error: toBulkGapFillError(
            erroredRuleAtBackfilling,
            BulkGapsFillStep.SCHEDULING,
            schedulingError
          ),
        };
      }

      return {
        outcome: BulkFillGapsScheduleResult.BACKFILLED,
      };
    });

    ruleAuditEventMock.mockImplementation((payload) => payload);

    results = await bulkFillGapsByRuleIds(
      rulesClientContext,
      {
        rules: allRules,
        range: backfillRange,
      },
      {
        maxGapCountPerRule: 1000,
      }
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should ensure the user is authorized for each combination of ruleTypeId and consumer found in the rules', () => {
    expect(ensuredAuthorizedMock).toHaveBeenCalledTimes(3);
    expect(ensuredAuthorizedMock).toHaveBeenNthCalledWith(1, {
      consumer: 'rule-consumer-0',
      entity: AlertingAuthorizationEntity.Rule,
      operation: WriteOperations.FillGaps,
      ruleTypeId: 'rule-alert-type-id-0',
    });
    expect(ensuredAuthorizedMock).toHaveBeenNthCalledWith(2, {
      consumer: 'rule-consumer-1',
      entity: AlertingAuthorizationEntity.Rule,
      operation: WriteOperations.FillGaps,
      ruleTypeId: 'rule-alert-type-id-1',
    });
    expect(ensuredAuthorizedMock).toHaveBeenNthCalledWith(3, {
      consumer: 'should-break',
      entity: AlertingAuthorizationEntity.Rule,
      operation: WriteOperations.FillGaps,
      ruleTypeId: 'should-break',
    });
  });

  it('should call batchBackfillRuleGaps correctly', () => {
    rulesThatAttemptedToBackfill.forEach((rule) => {
      expect(batchBackfillRuleGapsMock).toHaveBeenCalledWith(rulesClientContext, {
        rule,
        range: backfillRange,
        maxGapCountPerRule: 1000,
      });
    });
  });

  it('should return a list with rules that succeeded', () => {
    expect(results.backfilled).toHaveLength(successfulRules.length);
    // the order in which they are processed is not guaranteed because we use pMap
    successfulRules.forEach((successfulRule) => {
      expect(results.backfilled).toContain(successfulRule);
    });
  });

  it('should return a list with errored rules', () => {
    expect(results.errored).toEqual([
      toBulkGapFillError(
        erroredRuleAtAuthorization,
        BulkGapsFillStep.ACCESS_VALIDATION,
        authorizationError
      ),
      toBulkGapFillError(erroredRuleAtBackfilling, BulkGapsFillStep.SCHEDULING, schedulingError),
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
    bulkFillGapsByRuleIds(rulesClientContext, { rules: [], range }, { maxGapCountPerRule: 1000 });

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
  it('should throw an error if the end date is not strictly greater than the start date', async () => {
    await expect(
      getCallBulkFillGaps({
        start: now.toISOString(),
        end: now.toISOString(),
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
