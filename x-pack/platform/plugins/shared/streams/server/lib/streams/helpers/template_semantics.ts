/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonValue } from '@kbn/utility-types';

interface RuleObject {
  __template?: JsonValue;
  __one_of?: unknown[];
  __any_of?: unknown;
  __scope_link?: unknown;
  [key: string]: unknown;
}

function isRuleObject(value: unknown): value is RuleObject {
  return typeof value === 'object' && value !== null;
}

export function getTemplateFromRule(rule: unknown): JsonValue | undefined {
  if (rule === null) return null;

  const t = typeof rule;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    return rule as JsonValue;
  }

  if (Array.isArray(rule)) {
    if (rule.length === 1 && rule[0] && typeof rule[0] === 'object' && !Array.isArray(rule[0])) {
      const inner = getTemplateFromRule(rule[0]);
      return inner != null ? ([inner] as unknown as JsonValue) : ([] as unknown as JsonValue);
    }
    return [] as unknown as JsonValue;
  }

  if (isRuleObject(rule)) {
    if (rule.__template !== undefined) {
      return rule.__template as JsonValue;
    }

    if (Array.isArray(rule.__one_of) && rule.__one_of.length > 0) {
      return getTemplateFromRule(rule.__one_of[0]);
    }

    if ('__any_of' in rule) {
      return [] as unknown as JsonValue;
    }

    if ('__scope_link' in rule) {
      return {} as unknown as JsonValue;
    }

    return {} as unknown as JsonValue;
  }

  return undefined;
}
