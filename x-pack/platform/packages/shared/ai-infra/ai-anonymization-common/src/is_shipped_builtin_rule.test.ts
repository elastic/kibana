/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_BUILTIN_REGEX_RULES } from './default_builtin_regex_rules';
import { isShippedBuiltInRule } from './is_shipped_builtin_rule';
import type { RegexAnonymizationRule } from './types';

describe('isShippedBuiltInRule', () => {
  it.each(DEFAULT_BUILTIN_REGEX_RULES.map((rule) => [rule.id, rule] as const))(
    'trusts the shipped rule %s, whether it is enabled or not',
    (_, rule) => {
      expect(isShippedBuiltInRule(rule)).toBe(true);
      expect(isShippedBuiltInRule({ ...rule, enabled: !rule.enabled })).toBe(true);
    }
  );

  // `builtIn` is stored in a setting that can be written through the API, so it proves nothing alone.
  describe('does not trust a rule that only claims to be built in', () => {
    const [email] = DEFAULT_BUILTIN_REGEX_RULES;
    const claim = (overrides: Partial<RegexAnonymizationRule>): RegexAnonymizationRule => ({
      ...email,
      ...overrides,
    });

    it.each([
      ['an unknown id', claim({ id: 'builtin-made-up', pattern: '(a+)+$' })],
      ['a shipped id with another pattern', claim({ pattern: '(a+)+$' })],
      ['no id', claim({ id: undefined })],
      ['the shipped pattern without the flag', claim({ builtIn: false })],
      ['the shipped pattern with the flag missing', claim({ builtIn: undefined })],
    ])('%s', (_, rule) => {
      expect(isShippedBuiltInRule(rule)).toBe(false);
    });
  });
});
