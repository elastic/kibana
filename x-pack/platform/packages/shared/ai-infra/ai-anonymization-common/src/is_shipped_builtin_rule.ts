/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_BUILTIN_REGEX_RULES } from './default_builtin_regex_rules';
import type { RegexAnonymizationRule } from './types';

/**
 * Whether `rule` is one of the built-in rules shipped in code, with the shipped pattern.
 *
 * The `builtIn` flag alone is not proof: it is stored in the setting and the setting can be written
 * through the API, so any rule can claim it. Shipped patterns are vetted (bounded, identical on
 * native `RegExp` and RE2) and may run on the native engine; every other pattern must not get that
 * trust, however the rule is flagged.
 */
export const isShippedBuiltInRule = (rule: RegexAnonymizationRule): boolean =>
  rule.builtIn === true &&
  DEFAULT_BUILTIN_REGEX_RULES.some(
    (shipped) => shipped.id === rule.id && shipped.pattern === rule.pattern
  );
