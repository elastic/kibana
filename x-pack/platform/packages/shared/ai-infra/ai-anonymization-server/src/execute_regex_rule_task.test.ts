/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegexAnonymizationRule } from '@kbn/ai-anonymization-common';
import { DEFAULT_BUILTIN_REGEX_RULES } from '@kbn/ai-anonymization-common';
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
    entityClass: 'MISC',
    pattern: '\\d{3}-\\d{3}-\\d{4}',
  };

  const zeroLengthRule: RegexAnonymizationRule = {
    type: 'RegExp',
    enabled: true,
    entityClass: 'LOC',
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
      class_name: 'MISC',
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

  it('throws, naming the rule, when a pattern does not compile instead of silently skipping it', () => {
    const brokenRule: RegexAnonymizationRule = {
      type: 'RegExp',
      enabled: true,
      id: 'custom-1',
      name: 'Broken pattern',
      entityClass: 'MISC',
      pattern: '(unclosed',
    };

    expect(() =>
      executeRegexRulesTask({ rules: [emailRule, brokenRule], records: [{ content: 'a@b.com' }] })
    ).toThrow(/"Broken pattern" has an invalid regular expression/);
  });

  describe('custom rules run on RE2', () => {
    const custom = (pattern: string): RegexAnonymizationRule => ({
      type: 'RegExp',
      enabled: true,
      id: 'custom-1',
      name: 'Custom',
      entityClass: 'MISC',
      pattern,
    });
    const matchesOf = (pattern: string, content: string) =>
      executeRegexRulesTask({ rules: [custom(pattern)], records: [{ content }] }).map(
        ({ matchValue }) => matchValue
      );

    // The QA M6 input: with native RegExp this pattern backtracks for far longer than the worker timeout.
    it('finishes in linear time on a catastrophic pattern and input', () => {
      const start = performance.now();
      const result = matchesOf('(a+)+$', `${'a'.repeat(5000)}!`);

      expect(performance.now() - start).toBeLessThan(1000);
      expect(result).toEqual([]);
    });

    it.each([
      ['a Unicode property class', '\\p{L}+@x', 'héllo@x', ['héllo@x']],
      ['an inline flag', '(?i)secret', 'a SeCrEt b', ['SeCrEt']],
      ['an emoji as one character', '.', '😀', ['😀']],
      ['a character code', '\\x{00e9}', 'café', ['é']],
    ])('supports %s', (_, pattern, content, expected) => {
      expect(matchesOf(pattern, content)).toEqual(expected);
    });

    it.each([
      ['lookahead', 'foo(?=bar)'],
      ['lookbehind', '(?<=@)\\w+'],
      ['a backreference', '(a)\\1'],
      ['a \\u escape', '\\u00e9'],
    ])('rejects %s and says how custom patterns are written', (_, pattern) => {
      expect(() => matchesOf(pattern, 'x')).toThrow(
        /"Custom" has an invalid regular expression.*RE2/
      );
    });

    it('keeps built-in rules on native RegExp, which they are tested against', () => {
      const builtIn = { ...custom('(?:ab)(?=c)'), builtIn: true };

      expect(
        executeRegexRulesTask({ rules: [builtIn], records: [{ content: 'abc' }] })
      ).toHaveLength(1);
    });
  });

  describe('built-in account rule', () => {
    const accountRule: RegexAnonymizationRule = {
      ...(DEFAULT_BUILTIN_REGEX_RULES.find(
        ({ id }) => id === 'builtin-account-login'
      ) as RegexAnonymizationRule),
      enabled: true,
    };
    const content =
      'user="QACORP\\\\jdoe" SORT count DESC\\n| LIMIT 20 in C:\\WINDOWS\\System32 as CORP\\a.mehta';

    // Only the name is masked, never `DOMAIN\\` or the backslashes: the restored value must be exact
    // in any escaping layer (structured model output, tool arguments, JSON in JSON).
    it('masks the account name only, not the domain, escape sequences or path segments', () => {
      const matches = executeRegexRulesTask({ rules: [accountRule], records: [{ content }] });

      expect(matches.map(({ matchValue }) => matchValue)).toEqual(['jdoe', 'a.mehta']);
      expect(matches.some(({ matchValue }) => matchValue.includes('\\'))).toBe(false);
    });

    it('does not filter a custom rule that reuses the same pattern', () => {
      const { id, builtIn, ...custom } = accountRule;
      const matches = executeRegexRulesTask({ rules: [custom], records: [{ content }] });

      expect(matches.map(({ matchValue }) => matchValue)).toContain('WINDOWS\\System32');
    });
  });
});
