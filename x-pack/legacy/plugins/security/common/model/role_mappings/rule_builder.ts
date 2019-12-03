/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldRule } from './field_rule';
import { AllRule } from './all_rule';
import { AnyRule } from './any_rule';
import { BaseRule } from './base_rule';
import { ExceptFieldRule } from './except_field_rule';
import { ExceptAllRule } from './except_all_rule';
import { ExceptAnyRule } from './except_any_rule';
import { RoleMappingFieldRuleValue } from '..';

export class RuleBuilderError extends Error {
  constructor(message: string, public readonly ruleTrace: string[]) {
    super(message);

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, RuleBuilderError.prototype);
  }
}

export function createRuleForType(
  ruleType: string,
  ruleDefinition: any | undefined,
  parentRuleType: string | null,
  ruleTrace: string[] = []
) {
  const isRuleNegated = parentRuleType === 'except';

  switch (ruleType) {
    case 'field': {
      const fieldData = ruleDefinition || { username: '*' };

      const entries = Object.entries(fieldData);
      if (entries.length !== 1) {
        throw new RuleBuilderError(`Expected a single field, but found ${entries.length}`, [
          ...ruleTrace,
          ruleType,
        ]);
      }

      const [field, value] = entries[0] as [string, RoleMappingFieldRuleValue];
      const valueType = typeof value;
      if (value === null || ['string', 'number'].includes(valueType)) {
        const fieldRule = new FieldRule(field, value);
        return isRuleNegated ? new ExceptFieldRule(fieldRule) : fieldRule;
      }
      throw new RuleBuilderError(
        `Invalid value type for field. Expected one of null, string, or number, but found ${valueType} (${value})`,
        [...ruleTrace, `field[${field}]`]
      );
    }
    case 'all': {
      if (ruleDefinition != null && !Array.isArray(ruleDefinition)) {
        throw new RuleBuilderError(
          `Expected an array of rules, but found ${typeof ruleDefinition}`,
          [...ruleTrace, ruleType]
        );
      }
      const subRules = ((ruleDefinition as any[]) || []).map((definition: any, index) =>
        parseRawRules(definition, ruleType, [...ruleTrace, ruleType, `[${index}]`])
      ) as BaseRule[];
      return isRuleNegated ? new ExceptAllRule(subRules) : new AllRule(subRules);
    }
    case 'any': {
      if (ruleDefinition != null && !Array.isArray(ruleDefinition)) {
        throw new RuleBuilderError(
          `Expected an array of rules, but found ${typeof ruleDefinition}`,
          [...ruleTrace, 'any']
        );
      }
      const subRules = ((ruleDefinition as any[]) || []).map((definition: any, index) =>
        parseRawRules(definition, ruleType, [...ruleTrace, ruleType, `[${index}]`])
      ) as BaseRule[];
      return isRuleNegated ? new ExceptAnyRule(subRules) : new AnyRule(subRules);
    }
    case 'except': {
      if (ruleDefinition && typeof ruleDefinition !== 'object') {
        throw new RuleBuilderError(`Expected an object, but found ${typeof ruleDefinition}`, [
          ...ruleTrace,
          'except',
        ]);
      }
      if (parentRuleType !== 'all') {
        throw new RuleBuilderError(
          `'except' can only exist within an 'all' rule, but found within ${parentRuleType}`,
          [...ruleTrace, ruleType]
        );
      }
      return parseRawRules(ruleDefinition || {}, ruleType, [...ruleTrace, ruleType]);
    }
    default:
      throw new RuleBuilderError(`Unknown rule type: ${ruleType}`, [...ruleTrace, ruleType]);
  }
}

export function generateRulesFromRaw(rawRules: Record<string, any> = {}): BaseRule | null {
  return parseRawRules(rawRules, null, []);
}

function parseRawRules(
  rawRules: Record<string, any>,
  parentRuleType: string | null,
  ruleTrace: string[]
): BaseRule | null {
  const entries = Object.entries(rawRules) as Array<[string, any]>;
  if (!entries.length) {
    return null;
  }
  if (entries.length > 1) {
    throw new RuleBuilderError(
      `Expected a single rule definition, but found ${entries.length}`,
      ruleTrace
    );
  }

  const rule = entries[0];
  const [ruleType, ruleDefinition] = rule;
  return createRuleForType(ruleType, ruleDefinition, parentRuleType, ruleTrace);
}
