/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationRule, RegexAnonymizationRule } from './types';
import { DEFAULT_BUILTIN_REGEX_RULES } from './default_builtin_regex_rules';
import { refreshBuiltInAnonymizationRules } from './refresh_builtin_rules';

const customRule: RegexAnonymizationRule = {
  type: 'RegExp',
  id: 'custom-1',
  name: 'My custom pattern',
  entityClass: 'RESOURCE_NAME',
  pattern: 'foo-\\d+',
  enabled: true,
  builtIn: false,
};

const nerRule: AnonymizationRule = {
  type: 'NER',
  modelId: 'some-model',
  enabled: false,
  allowedEntityClasses: ['PER'],
};

describe('refreshBuiltInAnonymizationRules', () => {
  it('re-derives a stale built-in rule pattern/name/entityClass from current code, keeping its persisted enabled state', () => {
    const staleBuiltIn: RegexAnonymizationRule = {
      type: 'RegExp',
      id: 'builtin-host-name',
      name: 'Old name',
      entityClass: 'HOST_NAME',
      pattern: 'this-is-a-stale-pattern-frozen-in-a-saved-object',
      enabled: false,
      builtIn: true,
    };

    const [refreshed] = refreshBuiltInAnonymizationRules([
      staleBuiltIn,
    ]) as RegexAnonymizationRule[];
    const current = DEFAULT_BUILTIN_REGEX_RULES.find((rule) => rule.id === 'builtin-host-name')!;

    expect(refreshed.pattern).toBe(current.pattern);
    expect(refreshed.name).toBe(current.name);
    expect(refreshed.entityClass).toBe(current.entityClass);
    // The persisted `enabled` state must survive the refresh, even though it was `false` while
    // the code-level default is `true`.
    expect(refreshed.enabled).toBe(false);
  });

  it('appends a built-in rule missing from the persisted array using its code-defined default', () => {
    const rulesMissingHostName = DEFAULT_BUILTIN_REGEX_RULES.filter(
      (rule) => rule.id !== 'builtin-host-name'
    );

    const refreshed = refreshBuiltInAnonymizationRules(rulesMissingHostName);

    const hostNameRule = refreshed.find(
      (rule): rule is RegexAnonymizationRule =>
        rule.type === 'RegExp' && rule.id === 'builtin-host-name'
    );
    const codeDefault = DEFAULT_BUILTIN_REGEX_RULES.find(
      (rule) => rule.id === 'builtin-host-name'
    )!;

    expect(hostNameRule).toEqual(codeDefault);
  });

  it('leaves a built-in id no longer shipped in code untouched, rather than dropping it', () => {
    const removedBuiltIn: RegexAnonymizationRule = {
      type: 'RegExp',
      id: 'builtin-no-longer-shipped',
      name: 'Removed built-in',
      entityClass: 'URL',
      pattern: 'https?://.+',
      enabled: true,
      builtIn: true,
    };

    const refreshed = refreshBuiltInAnonymizationRules([removedBuiltIn]);

    expect(refreshed).toContainEqual(removedBuiltIn);
  });

  it('leaves custom (non-built-in) rules unchanged', () => {
    // Include every current built-in so none is considered "missing" and appended, isolating
    // the assertion to how the custom rule itself is (not) touched.
    const input = [customRule, ...DEFAULT_BUILTIN_REGEX_RULES];

    const refreshed = refreshBuiltInAnonymizationRules(input);

    expect(refreshed[0]).toEqual(customRule);
  });

  it('leaves NER rules unchanged', () => {
    const input = [nerRule, ...DEFAULT_BUILTIN_REGEX_RULES];

    const refreshed = refreshBuiltInAnonymizationRules(input);

    expect(refreshed[0]).toEqual(nerRule);
  });

  it('preserves the relative order of persisted rules and appends missing built-ins at the very end', () => {
    const rulesMissingIpv4 = DEFAULT_BUILTIN_REGEX_RULES.filter(
      (rule) => rule.id !== 'builtin-ipv4'
    );
    const input: AnonymizationRule[] = [customRule, ...rulesMissingIpv4, nerRule];

    const refreshed = refreshBuiltInAnonymizationRules(input);
    const ipv4Default = DEFAULT_BUILTIN_REGEX_RULES.find((rule) => rule.id === 'builtin-ipv4')!;

    expect(refreshed[0]).toEqual(customRule);
    expect(refreshed[refreshed.length - 2]).toEqual(nerRule);
    expect(refreshed[refreshed.length - 1]).toEqual(ipv4Default);
  });
});
