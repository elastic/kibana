/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_BUILTIN_REGEX_RULES } from './default_builtin_regex_rules';
import { parseLegacyAnonymizationRules, parseLegacyOnFailureMode } from './legacy_settings';

// The shape earlier releases persisted: no `maskingEnabled`, no `onFailure`, and rules without
// `id`/`builtIn`.
const legacyEmailRule = {
  type: 'RegExp',
  entityClass: 'EMAIL',
  pattern: '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
};
const legacyNerRule = { type: 'NER', modelId: 'model', allowedEntityClasses: ['PER'] };

describe('parseLegacyAnonymizationRules', () => {
  it('keeps masking only what an environment already enabled before the master switch existed', () => {
    const saved = {
      rules: [
        { ...legacyEmailRule, enabled: true },
        { ...legacyNerRule, enabled: false },
      ],
    };

    // Built-ins appended by the refresh must not widen masking to IPs and host names.
    expect(parseLegacyAnonymizationRules(saved)).toEqual([{ ...legacyEmailRule, enabled: true }]);
  });

  it('stays off for a pre-master-switch value with every rule disabled', () => {
    const saved = {
      rules: [
        { ...legacyEmailRule, enabled: false },
        { ...legacyNerRule, enabled: false },
      ],
    };

    expect(parseLegacyAnonymizationRules(saved)).toEqual([]);
  });

  it('runs nothing when the master switch is explicitly off, whatever the rules say', () => {
    const saved = { maskingEnabled: false, rules: [{ ...legacyEmailRule, enabled: true }] };

    expect(parseLegacyAnonymizationRules(saved)).toEqual([]);
  });

  it('runs the enabled rules, built-ins refreshed from current code, when the switch is on', () => {
    const saved = {
      maskingEnabled: true,
      rules: DEFAULT_BUILTIN_REGEX_RULES.map((rule) => ({ ...rule, pattern: 'stale' })),
    };

    const rules = parseLegacyAnonymizationRules(saved);

    expect(rules).toEqual(DEFAULT_BUILTIN_REGEX_RULES.filter(({ enabled }) => enabled));
  });

  it('accepts the raw JSON string form', () => {
    const saved = JSON.stringify({
      maskingEnabled: true,
      rules: [{ ...legacyEmailRule, enabled: true }],
    });

    expect(parseLegacyAnonymizationRules(saved)).toHaveLength(1);
  });

  const unreadableValues: unknown[] = ['not json', null, {}, { rules: 'nope' }];

  unreadableValues.forEach((saved) => {
    it(`returns no rules for ${JSON.stringify(saved)}`, () => {
      expect(parseLegacyAnonymizationRules(saved)).toEqual([]);
    });
  });
});

describe('parseLegacyOnFailureMode', () => {
  it('defaults to the safe mode when unset or unreadable', () => {
    expect(parseLegacyOnFailureMode({ rules: [] })).toBe('block');
    expect(parseLegacyOnFailureMode('not json')).toBe('block');
  });

  it('returns the configured mode', () => {
    expect(parseLegacyOnFailureMode({ rules: [], onFailure: 'allow_unsafe' })).toBe('allow_unsafe');
  });
});
