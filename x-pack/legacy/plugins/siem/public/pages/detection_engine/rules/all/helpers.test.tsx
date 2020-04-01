/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { bucketRulesResponse, showRulesTable } from './helpers';
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

  describe('showRulesTable', () => {
    test('returns false when rulesCustomInstalled and rulesInstalled are null', () => {
      const result = showRulesTable({
        rulesCustomInstalled: null,
        rulesInstalled: null,
      });
      expect(result).toBeFalsy();
    });

    test('returns false when rulesCustomInstalled and rulesInstalled are 0', () => {
      const result = showRulesTable({
        rulesCustomInstalled: 0,
        rulesInstalled: 0,
      });
      expect(result).toBeFalsy();
    });

    test('returns false when both rulesCustomInstalled and rulesInstalled checks return false', () => {
      const result = showRulesTable({
        rulesCustomInstalled: 0,
        rulesInstalled: null,
      });
      expect(result).toBeFalsy();
    });

    test('returns true if rulesCustomInstalled is not null or 0', () => {
      const result = showRulesTable({
        rulesCustomInstalled: 5,
        rulesInstalled: null,
      });
      expect(result).toBeTruthy();
    });

    test('returns true if rulesInstalled is not null or 0', () => {
      const result = showRulesTable({
        rulesCustomInstalled: null,
        rulesInstalled: 5,
      });
      expect(result).toBeTruthy();
    });
  });
});
