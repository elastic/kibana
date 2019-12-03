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

export function createRuleForType(
  ruleType: string,
  ruleDefinition: any | undefined,
  isNegated: boolean = false
) {
  switch (ruleType) {
    case 'field': {
      const fieldData = ruleDefinition || { username: '*' };
      const [field, value] = Object.entries(fieldData)[0] as [string, RoleMappingFieldRuleValue];
      const valueType = typeof value;
      if (value === null || ['string', 'number'].includes(valueType)) {
        return new FieldRule(isNegated, field, value);
      }
      throw new Error(
        `Invalid value type for field. Expected one of null, string, or number, but found ${valueType} (${value})`
      );
    }
    case 'all': {
      if (ruleDefinition && !Array.isArray(ruleDefinition)) {
        throw new Error(`Expected an array of rules, but found ${typeof ruleDefinition}`);
      }
      const subRules = (ruleDefinition || []).map((definition: any) =>
        generateRulesFromRaw(definition)
      );
      return new AllRule(isNegated, subRules);
    }
    case 'any': {
      if (ruleDefinition && !Array.isArray(ruleDefinition)) {
        throw new Error(`Expected an array of rules, but found ${typeof ruleDefinition}`);
      }
      const subRules = (ruleDefinition || []).map((definition: any) =>
        generateRulesFromRaw(definition)
      );
      return new AnyRule(isNegated, subRules);
    }
    case 'except': {
      return generateRulesFromRaw(
        (ruleDefinition && ruleDefinition.except) || { except: {} },
        true
      );
    }
    default:
      throw new Error(`Unknown rule type: ${ruleType}`);
  }
}

export function generateRulesFromRaw(
  rawRules: Record<string, any> = {},
  isNegated: boolean = false
): BaseRule | null {
  const entries = Object.entries(rawRules) as Array<[string, any]>;
  if (!entries.length) {
    return null;
  }
  if (entries.length > 1) {
    throw new Error(`Expected a single rule definition, but found ${entries.length}`);
  }

  const rule = entries[0];
  const [ruleType, ruleDefinition] = rule;
  return createRuleForType(ruleType, ruleDefinition, isNegated);
}
