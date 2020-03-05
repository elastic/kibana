/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { bucketRulesResponse } from './helpers';
import { mockRule, mockRuleError } from './__mocks__/mock';
import uuid from 'uuid';
import { Rule, RuleError } from '../../../../containers/detection_engine/rules';

describe('AllRulesTable Helpers', () => {
  const mockRule1: Readonly<Rule> = mockRule(uuid.v4());
  const mockRule2: Readonly<Rule> = mockRule(uuid.v4());
  const mockRuleError1: Readonly<RuleError> = mockRuleError(uuid.v4());
  const mockRuleError2: Readonly<RuleError> = mockRuleError(uuid.v4());

  describe('bucketRulesResponse', () => {
    test('buckets empty response', () => {
      const bucketedResponse = bucketRulesResponse([]);
      expect(bucketedResponse).toEqual({ rules: [], errors: [] });
    });

    test('buckets all error response', () => {
      const bucketedResponse = bucketRulesResponse([mockRuleError1, mockRuleError2]);
      expect(bucketedResponse).toEqual({ rules: [], errors: [mockRuleError1, mockRuleError2] });
    });

    test('buckets all success response', () => {
      const bucketedResponse = bucketRulesResponse([mockRule1, mockRule2]);
      expect(bucketedResponse).toEqual({ rules: [mockRule1, mockRule2], errors: [] });
    });

    test('buckets mixed success/error response', () => {
      const bucketedResponse = bucketRulesResponse([
        mockRule1,
        mockRuleError1,
        mockRule2,
        mockRuleError2,
      ]);
      expect(bucketedResponse).toEqual({
        rules: [mockRule1, mockRule2],
        errors: [mockRuleError1, mockRuleError2],
      });
    });
  });
});
