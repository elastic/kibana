/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRuleSoToSanitizedRule } from '../../transforms';
import { bulkGetRulesSo } from '../../../../data/rule';
import { bulkGetRules } from './bulk_get_rules';
import { rulesClientContextMock } from '../../../../rules_client/rules_client.mock';
import type { BulkGetRulesResponse } from './types/bulk_get_rules_response';
import type { RuleParams } from '../../types';
import { RuleAuditAction } from '../../../../rules_client/common/audit_events';
import type { BulkGetRulesParams } from './types';
import {
  getAuthorizationFilter,
  checkAuthorizationAndGetTotal,
} from '../../../../rules_client/lib';

jest.mock('../../transforms', () => {
  return {
    transformRuleSoToSanitizedRule: jest.fn(),
  };
});

jest.mock('../../../../data/rule', () => {
  return {
    bulkGetRulesSo: jest.fn(),
  };
});

jest.mock('../../../../rules_client/lib', () => {
  return {
    getAuthorizationFilter: jest.fn(),
    checkAuthorizationAndGetTotal: jest.fn(),
  };
});

const rulesClientContext = rulesClientContextMock.create();
const transformRuleSoToSanitizedRuleMock = transformRuleSoToSanitizedRule as jest.Mock;
const bulkGetRulesSoMock = bulkGetRulesSo as jest.Mock;
const auditLoggerMock = rulesClientContext.auditLogger?.log as jest.Mock;
const getAuthorizationFilterMock = getAuthorizationFilter as jest.Mock;
const checkAuthorizationAndGetTotalMock = checkAuthorizationAndGetTotal as jest.Mock;

const getRule = (id: string, alertTypeId: string, consumer: string) => ({
  id,
  attributes: { name: `rule-so-${id}`, alertTypeId, consumer },
});
const getRuleErroredFetchingSo = (id: string) => ({ id, error: { message: `rule ${id} errored` } });
const getTestRules = () => {
  const successful = [
    getRule('1', 'some-alert-type-1', 'some-consumer-1'),
    getRule('2', 'some-alert-type-1', 'some-consumer-2'),
    getRule('3', 'some-alert-type-2', 'some-consumer-1'),
    getRule('4', 'some-alert-type-2', 'some-consumer-1'),
  ];

  const erroredFetchingSo = [getRuleErroredFetchingSo('5')];

  return {
    successful,
    erroredFetchingSo,
    all: [...successful, ...erroredFetchingSo],
  };
};

describe('bulkGetRules', () => {
  let ruleIds: string[] = [];
  let results: BulkGetRulesResponse<RuleParams>;
  let testRules: ReturnType<typeof getTestRules>;
  beforeEach(async () => {
    jest.resetAllMocks();
    testRules = getTestRules();
    ruleIds = testRules.all.map(({ id }) => id);
    transformRuleSoToSanitizedRuleMock.mockImplementation((_, rule) => {
      return {
        ...rule,
        sanitized: true,
      };
    });

    bulkGetRulesSoMock.mockResolvedValueOnce({
      saved_objects: testRules.all,
    });

    getAuthorizationFilterMock.mockResolvedValue([]);

    checkAuthorizationAndGetTotalMock.mockResolvedValueOnce({ total: 0 });

    results = await bulkGetRules(rulesClientContext, { ids: ruleIds });
  });

  it('should throw if called with invalid params', async () => {
    await expect(
      bulkGetRules(rulesClientContext, {} as unknown as BulkGetRulesParams)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Error validating get rules params - [ids]: expected value of type [array] but got [undefined]"'
    );
  });

  it('should throw an error if it fails to verify the user access to the rules', async () => {
    const authError = new Error('Some auth error');
    checkAuthorizationAndGetTotalMock.mockRejectedValueOnce(authError);
    await expect(
      bulkGetRules(rulesClientContext, { ids: ruleIds } as unknown as BulkGetRulesParams)
    ).rejects.toThrowError(authError);
  });

  it('should attempt to resolve rules', () => {
    expect(bulkGetRulesSoMock).toHaveBeenCalledTimes(1);
    expect(bulkGetRulesSoMock).toHaveBeenCalledWith({
      savedObjectsClient: rulesClientContext.unsecuredSavedObjectsClient,
      ids: ruleIds,
    });
  });

  it('should audit log', () => {
    expect(auditLoggerMock).toHaveBeenCalledTimes(5);
    const assertAuditLogCall = (id: string, name?: string, errorMsg?: string) => {
      const errorObj = errorMsg ? expect.objectContaining({ message: errorMsg }) : undefined;
      const ruleObj: { id: string; name?: string } = { id };
      if (name) {
        ruleObj.name = name;
      }
      expect(auditLoggerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: errorObj,
          event: expect.objectContaining({
            outcome: errorMsg ? 'failure' : 'success',
            action: RuleAuditAction.GET,
          }),
          kibana: expect.objectContaining({
            saved_object: expect.objectContaining(ruleObj),
          }),
        })
      );
    };
    testRules.successful.forEach(({ id, attributes: { name } }) => {
      assertAuditLogCall(id, name);
    });

    testRules.erroredFetchingSo.forEach(({ id, error }) => {
      assertAuditLogCall(id, undefined, error.message);
    });
  });

  it('should attempt to sanitize the rules', () => {
    expect(transformRuleSoToSanitizedRuleMock).toHaveBeenCalledTimes(testRules.successful.length);
    testRules.successful.forEach((rule) => {
      expect(transformRuleSoToSanitizedRuleMock).toHaveBeenCalledWith(rulesClientContext, rule, {});
    });
  });

  it('should return the sanitized rules', () => {
    const expectedReturned = testRules.successful.map((rule) => ({ ...rule, sanitized: true }));
    expect(results.rules).toEqual(expectedReturned);
  });

  it('should return any errors that occurred', () => {
    expect(results.errors).toEqual(testRules.erroredFetchingSo);
  });
});
