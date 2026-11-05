/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The form edits a rule's `when` as a field matched against a value. Any other
 * OTTL condition is kept as written and shown read-only.
 */
export type RoutingRuleCondition = { field: string; value: string } | { raw: string };

const EQUALITY_CONDITION = /^\s*(.+?)\s*==\s*"((?:[^"\\]|\\.)*)"\s*$/;

const escapeValue = (value: string): string => value.replace(/[\\"]/g, (char) => `\\${char}`);

const unescapeValue = (value: string): string => value.replace(/\\(.)/g, '$1');

/** Reads a rule's `when`; `undefined` is a rule with no condition. */
export const parseWhen = (when: string | undefined): RoutingRuleCondition | undefined => {
  if (when === undefined) {
    return undefined;
  }
  const match = EQUALITY_CONDITION.exec(when);
  if (!match) {
    return { raw: when };
  }
  const [, field, value] = match;
  return { field, value: unescapeValue(value) };
};

/** Writes a condition as OTTL; an empty field leaves the rule without a condition. */
export const serializeCondition = (
  condition: RoutingRuleCondition | undefined
): string | undefined => {
  if (condition === undefined) {
    return undefined;
  }
  if ('raw' in condition) {
    return condition.raw;
  }
  const field = condition.field.trim();
  if (field === '') {
    return undefined;
  }
  return `${field} == "${escapeValue(condition.value)}"`;
};

export const isRawCondition = (
  condition: RoutingRuleCondition | undefined
): condition is { raw: string } => condition !== undefined && 'raw' in condition;
