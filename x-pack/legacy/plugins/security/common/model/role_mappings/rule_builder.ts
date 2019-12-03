/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldRule } from './field_rule';
import { AllRule } from './all_rule';
import { AnyRule } from './any_rule';
import { BaseRule } from './base_rule';
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
  isNegated: boolean = false,
  ruleTrace: string[] = []
) {
  switch (ruleType) {
    case 'field': {
      const fieldData = ruleDefinition || { username: '*' };

      const entries = Object.entries(fieldData);
      if (entries.length !== 1) {
        throw new RuleBuilderError(`Expected a single field, but found ${entries.length}`, [
          ...ruleTrace,
          `field`,
        ]);
      }

      const [field, value] = entries[0] as [string, RoleMappingFieldRuleValue];
      const valueType = typeof value;
      if (value === null || ['string', 'number'].includes(valueType)) {
        return new FieldRule(isNegated, field, value);
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
          [...ruleTrace, 'all']
        );
      }
      const subRules = ((ruleDefinition as any[]) || []).map((definition: any, index) =>
        parseRawRules(definition, false, [...ruleTrace, 'all', `[${index}]`])
      ) as BaseRule[];
      return new AllRule(isNegated, subRules);
    }
    case 'any': {
      if (ruleDefinition != null && !Array.isArray(ruleDefinition)) {
        throw new RuleBuilderError(
          `Expected an array of rules, but found ${typeof ruleDefinition}`,
          [...ruleTrace, 'any']
        );
      }
      const subRules = ((ruleDefinition as any[]) || []).map((definition: any, index) =>
        parseRawRules(definition, false, [...ruleTrace, 'any', `[${index}]`])
      ) as BaseRule[];
      return new AnyRule(isNegated, subRules);
    }
    case 'except': {
      if (ruleDefinition && typeof ruleDefinition !== 'object') {
        throw new RuleBuilderError(`Expected an object, but found ${typeof ruleDefinition}`, [
          ...ruleTrace,
          'except',
        ]);
      }
      return parseRawRules(ruleDefinition || {}, true, [...ruleTrace, 'except']);
    }
    default:
      throw new RuleBuilderError(`Unknown rule type: ${ruleType}`, [...ruleTrace, ruleType]);
  }
}

export function generateRulesFromRaw(
  rawRules: Record<string, any> = {},
  isNegated: boolean = false
): BaseRule | null {
  return parseRawRules(rawRules, isNegated, []);
}

function parseRawRules(
  rawRules: Record<string, any> = {},
  isNegated: boolean = false,
  ruleTrace: string[] = []
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
  return createRuleForType(ruleType, ruleDefinition, isNegated, ruleTrace);
}
