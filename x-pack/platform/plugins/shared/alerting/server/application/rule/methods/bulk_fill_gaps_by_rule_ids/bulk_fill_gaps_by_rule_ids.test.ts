/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateRuleAccess } from './validate_rule_access';
import { bulkFillGapsImpl } from './bulk_fill_gaps_impl';
import { rulesClientContextMock } from '../../../../rules_client/rules_client.mock';
import { bulkFillGapsByRuleIds } from './bulk_fill_gaps_by_rule_ids';
import type {
  BulkFillGapsByRuleIdsParams,
  BulkFillGapsByRuleIdsResult,
  BulkGapFillingErroredRule,
  BulkGapsFillStep,
} from './types';
import type { RulesClientContext } from '../../../../rules_client';
import { flatMap } from 'lodash';
jest.mock('./validate_rule_access', () => {
  return {
    validateRuleAccess: jest.fn(),
  };
});

jest.mock('./bulk_fill_gaps_impl', () => {
  return {
    bulkFillGapsImpl: jest.fn(),
  };
});

jest.mock('../../../../../common/constants', () => {
  const actual = jest.requireActual('../../../../../common/constants');
  return {
    ...actual,
    // Set it to 2 to make the function create chunks of 2 rules
    MAX_SCHEDULE_BACKFILL_BULK_SIZE: 2,
  };
});

const toErroredRule = (
  rule: { id: string; name: string },
  step: BulkGapsFillStep
): BulkGapFillingErroredRule => {
  return {
    rule,
    step,
    errorMessage: `Error ${step}`,
  };
};

const range = { start: '2025-05-09T09:15:09.457Z', end: '2025-05-09T09:24:09.457Z' };
const rules = Array.from({ length: 6 }, (_, idx) => ({
  id: `rule-${idx}`,
})) as BulkFillGapsByRuleIdsParams['rules'];

const validatedRules = rules.slice(0, 5);
const validationErrors = [toErroredRule(rules[5], 'ACCESS_VALIDATION')];
const schedulingOutcomes = validatedRules.map(({ id }) => ({ outcome: id }));

const firstRunResults = {
  outcomes: [schedulingOutcomes[0]],
  errored: [],
  skipped: [validatedRules[1]],
};
const secondRunResults = {
  outcomes: [schedulingOutcomes[2]],
  errored: [toErroredRule(validatedRules[3], 'RESOLVING_GAPS')],
  skipped: [],
};
const thirdRunResults = { outcomes: [schedulingOutcomes[4]], errored: [], skipped: [] };

describe('bulkFillGapsByRuleIds', () => {
  let results: BulkFillGapsByRuleIdsResult;
  let rulesClientContext: RulesClientContext;
  let refreshIndexMock: jest.Mock;
  let validateRuleAccessMock: jest.Mock;
  let bulkFillGapsImplMock: jest.Mock;

  beforeEach(async () => {
    rulesClientContext = rulesClientContextMock.create();
    const eventLogClientMock = rulesClientContext.getEventLogClient as jest.Mock;

    validateRuleAccessMock = validateRuleAccess as jest.Mock;
    bulkFillGapsImplMock = bulkFillGapsImpl as jest.Mock;

    refreshIndexMock = jest.fn();
    eventLogClientMock.mockResolvedValue({ refreshIndex: refreshIndexMock });

    validateRuleAccessMock.mockResolvedValueOnce({ validatedRules, errors: validationErrors });

    bulkFillGapsImplMock.mockResolvedValueOnce(firstRunResults);
    bulkFillGapsImplMock.mockResolvedValueOnce(secondRunResults);
    bulkFillGapsImplMock.mockResolvedValueOnce(thirdRunResults);

    results = await bulkFillGapsByRuleIds(rulesClientContext, { rules, range });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should validate that the user has access to the rules', () => {
    expect(validateRuleAccessMock).toHaveBeenCalledTimes(1);
    expect(validateRuleAccess).toHaveBeenCalledWith(rulesClientContext, rules);
  });

  it('should return the aggregation of all backfill outcomes', () => {
    expect(results.outcomes).toEqual(
      flatMap([firstRunResults, secondRunResults, thirdRunResults], 'outcomes')
    );
  });

  it('should return the aggregation of all errors', () => {
    expect(results.errored).toEqual([
      ...validationErrors,
      ...flatMap([firstRunResults, secondRunResults, thirdRunResults], 'errored'),
    ]);
  });

  it('should return the aggregation of all skipped rules', () => {
    expect(results.skipped).toEqual(
      flatMap([firstRunResults, secondRunResults, thirdRunResults], 'skipped')
    );
  });

  it('should split the list of rules into chunks specified by MAX_SCHEDULE_BACKFILL_BULK_SIZE', () => {
    expect(bulkFillGapsImplMock).toHaveBeenCalledTimes(3);
    expect(bulkFillGapsImplMock).toHaveBeenNthCalledWith(1, rulesClientContext, {
      rules: [rules[0], rules[1]],
      range,
    });
    expect(bulkFillGapsImplMock).toHaveBeenNthCalledWith(2, rulesClientContext, {
      rules: [rules[2], rules[3]],
      range,
    });
    expect(bulkFillGapsImplMock).toHaveBeenNthCalledWith(3, rulesClientContext, {
      rules: [rules[4]],
      range,
    });
  });

  it('should refresh the index of the event client once after filling all gaps', () => {
    const bulkFillGapsImplLastCallOrder = bulkFillGapsImplMock.mock.invocationCallOrder[2];
    expect(refreshIndexMock).toHaveBeenCalledTimes(1);
    expect(refreshIndexMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      bulkFillGapsImplLastCallOrder
    );
  });
});
