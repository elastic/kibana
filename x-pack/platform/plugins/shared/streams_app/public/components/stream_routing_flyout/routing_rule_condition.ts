/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RoutingConditionOperator = 'equals' | 'notEquals';

export interface RoutingFieldCondition {
  /** The attribute name as users know it, such as `service.name`. */
  field: string;
  operator: RoutingConditionOperator;
  value: string;
}

/**
 * The form edits a rule's `when` as a resource attribute compared with a
 * value. Any other OTTL condition is kept as written and shown read-only.
 */
export type RoutingRuleCondition = RoutingFieldCondition | { raw: string };

const OTTL_OPERATORS: Readonly<Record<RoutingConditionOperator, string>> = {
  equals: '==',
  notEquals: '!=',
};

/**
 * A string literal whose only escapes are `\\` and `\"`, the ones the form writes.
 * Any other escape (such as `\t`) keeps the condition raw, so it is never rewritten.
 */
const QUOTED = '"((?:[^"\\\\]|\\\\["\\\\])*)"';

const COMPARISON_CONDITION = new RegExp(
  `^\\s*resource\\.attributes\\[${QUOTED}\\]\\s*(==|!=)\\s*${QUOTED}\\s*$`
);

const escapeString = (value: string): string => value.replace(/[\\"]/g, (char) => `\\${char}`);

const unescapeString = (value: string): string => value.replace(/\\(["\\])/g, '$1');

/** The OTTL path of a resource attribute. */
const attributePath = (field: string): string => `resource.attributes["${escapeString(field)}"]`;

/** Reads a rule's `when`; `undefined` is a rule with no condition. */
export const parseWhen = (when: string | undefined): RoutingRuleCondition | undefined => {
  if (when === undefined) {
    return undefined;
  }
  const match = COMPARISON_CONDITION.exec(when);
  if (!match) {
    return { raw: when };
  }
  const [, field, operator, value] = match;
  return {
    field: unescapeString(field),
    operator: operator === OTTL_OPERATORS.notEquals ? 'notEquals' : 'equals',
    value: unescapeString(value),
  };
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
  return `${attributePath(field)} ${OTTL_OPERATORS[condition.operator]} "${escapeString(
    condition.value
  )}"`;
};

export const isRawCondition = (
  condition: RoutingRuleCondition | undefined
): condition is { raw: string } => condition !== undefined && 'raw' in condition;

/** An empty condition, as a newly added rule starts with. */
export const createEmptyCondition = (): RoutingFieldCondition => ({
  field: '',
  operator: 'equals',
  value: '',
});
