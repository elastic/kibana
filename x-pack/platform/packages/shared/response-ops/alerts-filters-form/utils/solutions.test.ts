/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeSolution } from '@kbn/alerting-types';
import type { InternalRuleType } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';
import { getAvailableSolutions, getRuleTypeIdsForSolution } from './solutions';

const stackRuleType = { id: 'stack-rule-type', solution: 'stack' } as InternalRuleType;
const observabilityRuleType = {
  id: 'observability-rule-type',
  solution: 'observability',
} as InternalRuleType;
const securityRuleType = { id: 'security-rule-type', solution: 'security' } as InternalRuleType;
const ruleTypes = [stackRuleType, observabilityRuleType, securityRuleType];

describe('getRuleTypeIdsForSolution', () => {
  it.each(['stack', 'observability', 'security'] as RuleTypeSolution[])(
    'should include %s rule type ids in the returned array',
    (solution) => {
      const solutionRuleTypeIds = ruleTypes
        .filter((ruleType) => ruleType.solution === solution)
        .map((ruleType) => ruleType.id);
      const ruleTypeIds = getRuleTypeIdsForSolution(ruleTypes, solution);
      for (const ruleTypeId of solutionRuleTypeIds) {
        expect(ruleTypeIds).toContain(ruleTypeId);
      }
    }
  );

  it('should group stack rule type ids under observability', () => {
    expect(getRuleTypeIdsForSolution(ruleTypes, 'observability')).toEqual([
      'stack-rule-type',
      'observability-rule-type',
    ]);
  });

  it('should always return security rule type ids in isolation', () => {
    expect(getRuleTypeIdsForSolution(ruleTypes, 'security')).toEqual(['security-rule-type']);
    expect(getRuleTypeIdsForSolution(ruleTypes, 'security')).toEqual(['security-rule-type']);
  });
});

describe('getAvailableSolutions', () => {
  it('should filter out unsupported solutions', () => {
    expect(
      getAvailableSolutions([
        // @ts-expect-error: Testing unsupported rule type
        { id: 'unsupported-rule-type', solution: 'unsupported' },
        stackRuleType,
      ])
    ).toEqual(['stack']);
  });

  it('should group stack under observability', () => {
    expect(getAvailableSolutions(ruleTypes)).toEqual(['observability', 'security']);
  });

  it("should show stack when it's the only alternative to security", () => {
    expect(getAvailableSolutions([stackRuleType, securityRuleType])).toEqual(['stack', 'security']);
  });
});
