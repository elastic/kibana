/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegexAnonymizationRule } from '@kbn/inference-common';
import { executeRegexRulesTask } from './execute_regex_rule_task';

describe('executeRegexRulesTask', () => {
  const emailRule: RegexAnonymizationRule = {
    type: 'RegExp',
    enabled: true,
    entityClass: 'EMAIL',
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
  };

  const phoneRule: RegexAnonymizationRule = {
    type: 'RegExp',
    enabled: true,
    entityClass: 'PHONE',
    pattern: '\\d{3}-\\d{3}-\\d{4}',
  };

  const zeroLengthRule: RegexAnonymizationRule = {
    type: 'RegExp',
    enabled: true,
    entityClass: 'BOUNDARY',
    pattern: 'a*', // Can match zero or more 'a's (including zero-length matches)
  };

  it('detects matches from a single regex rule', () => {
    const records = [{ content: 'Contact me at carlos@example.com for details' }];
    const result = executeRegexRulesTask({ rules: [emailRule], records });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ruleIndex: 0,
      recordIndex: 0,
      recordKey: 'content',
      start: 14,
      end: 32,
      matchValue: 'carlos@example.com',
      class_name: 'EMAIL',
    });
  });

  it('detects matches from multiple regex rules', () => {
    const records = [{ content: 'Email carlos@test.com or call 555-123-4567' }];
    const result = executeRegexRulesTask({ rules: [emailRule, phoneRule], records });

    expect(result).toHaveLength(2);

    expect(result[0]).toEqual({
      ruleIndex: 0,
      recordIndex: 0,
      recordKey: 'content',
      start: 6,
      end: 21,
      matchValue: 'carlos@test.com',
      class_name: 'EMAIL',
    });

    expect(result[1]).toEqual({
      ruleIndex: 1,
      recordIndex: 0,
      recordKey: 'content',
      start: 30,
      end: 42,
      matchValue: '555-123-4567',
      class_name: 'PHONE',
    });
  });

  it('detects matches across multiple records', () => {
    const records: Record<string, string>[] = [
      { content: 'First email: maria@test.com' },
      { data: 'Second email: diego@example.org' },
    ];
    const result = executeRegexRulesTask({ rules: [emailRule], records });

    expect(result).toHaveLength(2);

    expect(result[0]).toEqual({
      ruleIndex: 0,
      recordIndex: 0,
      recordKey: 'content',
      start: 13,
      end: 27,
      matchValue: 'maria@test.com',
      class_name: 'EMAIL',
    });

    expect(result[1]).toEqual({
      ruleIndex: 0,
      recordIndex: 1,
      recordKey: 'data',
      start: 14,
      end: 31,
      matchValue: 'diego@example.org',
      class_name: 'EMAIL',
    });
  });

  it('detects multiple matches within the same field', () => {
    const records = [{ content: 'Emails: carlos@test.com and sofia@example.org' }];
    const result = executeRegexRulesTask({ rules: [emailRule], records });

    expect(result).toHaveLength(2);

    expect(result[0]).toEqual({
      ruleIndex: 0,
      recordIndex: 0,
      recordKey: 'content',
      start: 8,
      end: 23,
      matchValue: 'carlos@test.com',
      class_name: 'EMAIL',
    });

    expect(result[1]).toEqual({
      ruleIndex: 0,
      recordIndex: 0,
      recordKey: 'content',
      start: 28,
      end: 45,
      matchValue: 'sofia@example.org',
      class_name: 'EMAIL',
    });
  });

  it('handles zero-length matches without infinite loops', () => {
    // Test with text that has no 'a's - would normally create zero-length matches
    const records = [{ content: 'hello world' }];
    const result = executeRegexRulesTask({ rules: [zeroLengthRule], records });

    // Should complete without hanging and return empty results
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it('handles zero-length rule but still finds legitimate matches', () => {
    // Test with text that has 'a's - should find actual matches
    const records = [{ content: 'aaa hello aaa world' }];
    const result = executeRegexRulesTask({ rules: [zeroLengthRule], records });

    expect(result.length).toBeGreaterThan(0);

    // All matches should have length > 0 (no zero-length matches)
    result.forEach((match) => {
      expect(match.matchValue.length).toBeGreaterThan(0);
      expect(match.matchValue).toMatch(/a+/); // Should be sequences of 'a's
    });
  });
});
