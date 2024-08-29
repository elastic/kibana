/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractErrorMessage, defaultErrorMessage, buildMutedRulesFilter } from './helpers';

const fallbackMessage = 'thisIsAFallBackMessage';

describe('test helper methods', () => {
  describe('extractErrorMessage Test', () => {
    it('should return error message if input is instance of Error', () => {
      const errorMessage = 'thisIsInstanceOfErrorMessage';
      const error = new Error(errorMessage);
      const extractedErrorMessage = extractErrorMessage(error, fallbackMessage);

      expect(extractedErrorMessage).toMatch(errorMessage);
    });

    it('should return string if input is string', () => {
      const error: string = 'thisIsAString';
      const extractedErrorMessage = extractErrorMessage(error, fallbackMessage);

      expect(extractedErrorMessage).toMatch(error);
    });

    it('should return fallbackMessage is input is not string nor instance of Error', () => {
      const error: number = 12345;
      const extractedErrorMessage = extractErrorMessage(error, fallbackMessage);

      expect(extractedErrorMessage).toMatch(fallbackMessage);
    });

    it('should return default message when input is not string nor instance of Error and fallbackMessage is not provided', () => {
      const error: number = 12345;
      const extractedErrorMessage = extractErrorMessage(error);

      expect(extractedErrorMessage).toMatch(defaultErrorMessage);
    });
  });

  describe('buildMutedRulesFilter Test', () => {
    it('should return an empty array if no rules are muted', () => {
      const rulesStates = {
        rule1: {
          muted: false,
          benchmark_id: '1',
          benchmark_version: '1.0',
          rule_number: '1',
          rule_id: '11',
        },
        rule2: {
          muted: false,
          benchmark_id: '2',
          benchmark_version: '1.0',
          rule_number: '2',
          rule_id: '22',
        },
      };

      expect(buildMutedRulesFilter(rulesStates)).toEqual([]);
    });

    it('should return the correct query for a single muted rule', () => {
      const rulesStates = {
        rule1: {
          muted: true,
          benchmark_id: '1',
          benchmark_version: '1.0',
          rule_number: '1',
          rule_id: '11',
        },
        rule2: {
          muted: false,
          benchmark_id: '2',
          benchmark_version: '1.0',
          rule_number: '2',
          rule_id: '22',
        },
      };

      const expectedQuery = [
        {
          bool: {
            must: [
              { term: { 'rule.benchmark.id': '1' } },
              { term: { 'rule.benchmark.version': '1.0' } },
              { term: { 'rule.benchmark.rule_number': '1' } },
            ],
          },
        },
      ];

      expect(buildMutedRulesFilter(rulesStates)).toEqual(expectedQuery);
    });

    it('should return the correct queries for multiple muted rules', () => {
      const rulesStates = {
        rule1: {
          muted: true,
          benchmark_id: '1',
          benchmark_version: '1.0',
          rule_number: '1',
          rule_id: '11',
        },
        rule2: {
          muted: true,
          benchmark_id: '2',
          benchmark_version: '1.0',
          rule_number: '2',
          rule_id: '22',
        },
      };

      const expectedQuery = [
        {
          bool: {
            must: [
              { term: { 'rule.benchmark.id': '1' } },
              { term: { 'rule.benchmark.version': '1.0' } },
              { term: { 'rule.benchmark.rule_number': '1' } },
            ],
          },
        },
        {
          bool: {
            must: [
              { term: { 'rule.benchmark.id': '2' } },
              { term: { 'rule.benchmark.version': '1.0' } },
              { term: { 'rule.benchmark.rule_number': '2' } },
            ],
          },
        },
      ];

      expect(buildMutedRulesFilter(rulesStates)).toEqual(expectedQuery);
    });
  });
});
