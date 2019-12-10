/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FieldRule, FieldRuleValue } from './field_rule';
import { AllRule } from './all_rule';
import { AnyRule } from './any_rule';
import { Rule } from './rule';
import { ExceptFieldRule } from './except_field_rule';
import { ExceptAllRule } from './except_all_rule';
import { ExceptAnyRule } from './except_any_rule';

export class RuleBuilderError extends Error {
  constructor(message: string, public readonly ruleTrace: string[]) {
    super(message);

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, RuleBuilderError.prototype);
  }
}

interface RuleBuilderResult {
  maxDepth: number;
  rules: Rule | null;
}

export function generateRulesFromRaw(rawRules: Record<string, any> = {}): RuleBuilderResult {
  return parseRawRules(rawRules, null, [], 0);
}

function parseRawRules(
  rawRules: Record<string, any>,
  parentRuleType: string | null,
  ruleTrace: string[],
  depth: number
): RuleBuilderResult {
  const entries = Object.entries(rawRules) as Array<[string, any]>;
  if (!entries.length) {
    return createResult(null, depth);
  }
  if (entries.length > 1) {
    throw new RuleBuilderError(
      i18n.translate('xpack.security.management.editRoleMapping.ruleBuilder.expectSingleRule', {
        defaultMessage: `Expected a single rule definition, but found {numberOfRules}.`,
        values: { numberOfRules: entries.length },
      }),
      ruleTrace
    );
  }

  const rule = entries[0];
  const [ruleType, ruleDefinition] = rule;
  return createRuleForType(ruleType, ruleDefinition, parentRuleType, ruleTrace, depth + 1);
}

function createResult(rules: Rule | null, ...depths: number[]) {
  return {
    rules,
    maxDepth: Math.max(...depths),
  };
}

function createRuleForType(
  ruleType: string,
  ruleDefinition: any | undefined,
  parentRuleType: string | null,
  ruleTrace: string[] = [],
  depth: number
): RuleBuilderResult {
  const isRuleNegated = parentRuleType === 'except';

  switch (ruleType) {
    case 'field': {
      const fieldData = ruleDefinition || { username: '*' };

      let fieldDataType: string = typeof fieldData;
      if (Array.isArray(fieldData)) {
        fieldDataType = 'array';
      }
      if (fieldDataType !== 'object') {
        throw new RuleBuilderError(
          i18n.translate(
            'xpack.security.management.editRoleMapping.ruleBuilder.expectedObjectForFieldRule',
            {
              defaultMessage: `Expected an object, but found {unexpectedType}.`,
              values: { unexpectedType: fieldDataType },
            }
          ),
          [...ruleTrace, ruleType]
        );
      }

      const entries = Object.entries(fieldData);
      if (entries.length !== 1) {
        throw new RuleBuilderError(
          i18n.translate(
            'xpack.security.management.editRoleMapping.ruleBuilder.expectedObjectForFieldRule',
            {
              defaultMessage: `Expected a single field, but found {count}.`,
              values: { count: entries.length },
            }
          ),
          [...ruleTrace, ruleType]
        );
      }

      const [field, value] = entries[0] as [string, FieldRuleValue];
      const values = Array.isArray(value) ? value : [value];
      values.forEach(fieldValue => {
        const valueType = typeof fieldValue;
        if (fieldValue !== null && !['string', 'number'].includes(valueType)) {
          throw new RuleBuilderError(
            i18n.translate(
              'xpack.security.management.editRoleMapping.ruleBuilder.invalidFieldValueType',
              {
                defaultMessage: `Invalid value type for field. Expected one of null, string, or number, but found {valueType} ({value}).`,
                values: { valueType, value: JSON.stringify(value) },
              }
            ),
            [...ruleTrace, `field[${field}]`]
          );
        }
      });

      const fieldRule = new FieldRule(field, value);
      return createResult(isRuleNegated ? new ExceptFieldRule(fieldRule) : fieldRule, depth);
    }
    case 'all': {
      if (ruleDefinition != null && !Array.isArray(ruleDefinition)) {
        throw new RuleBuilderError(
          i18n.translate(
            'xpack.security.management.editRoleMapping.ruleBuilder.expectedArrayForAllRule',
            {
              defaultMessage: `Expected an array of rules, but found {type}.`,
              values: { type: typeof ruleDefinition },
            }
          ),
          [...ruleTrace, ruleType]
        );
      }

      const subRulesResults = ((ruleDefinition as any[]) || []).map((definition: any, index) =>
        parseRawRules(definition, ruleType, [...ruleTrace, ruleType, `[${index}]`], depth)
      ) as RuleBuilderResult[];

      const { subRules, maxDepth } = subRulesResults.reduce(
        (acc, result) => {
          return {
            subRules: [...acc.subRules, result.rules!],
            maxDepth: Math.max(acc.maxDepth, result.maxDepth),
          };
        },
        { subRules: [] as Rule[], maxDepth: 0 }
      );

      return createResult(
        isRuleNegated ? new ExceptAllRule(subRules) : new AllRule(subRules),
        maxDepth
      );
    }
    case 'any': {
      if (ruleDefinition != null && !Array.isArray(ruleDefinition)) {
        throw new RuleBuilderError(
          i18n.translate(
            'xpack.security.management.editRoleMapping.ruleBuilder.expectedArrayForAnyRule',
            {
              defaultMessage: `Expected an array of rules, but found {type}.`,
              values: { type: typeof ruleDefinition },
            }
          ),
          [...ruleTrace, 'any']
        );
      }
      const subRulesResults = ((ruleDefinition as any[]) || []).map((definition: any, index) =>
        parseRawRules(definition, ruleType, [...ruleTrace, ruleType, `[${index}]`], depth)
      ) as RuleBuilderResult[];

      const { subRules, maxDepth } = subRulesResults.reduce(
        (acc, result) => {
          return {
            subRules: [...acc.subRules, result.rules!],
            maxDepth: Math.max(acc.maxDepth, result.maxDepth),
          };
        },
        { subRules: [] as Rule[], maxDepth: 0 }
      );

      return createResult(
        isRuleNegated ? new ExceptAnyRule(subRules) : new AnyRule(subRules),
        maxDepth
      );
    }
    case 'except': {
      if (ruleDefinition && typeof ruleDefinition !== 'object') {
        throw new RuleBuilderError(
          i18n.translate(
            'xpack.security.management.editRoleMapping.ruleBuilder.expectedObjectForExceptRule',
            {
              defaultMessage: `Expected an object, but found {type}.`,
              values: { type: typeof ruleDefinition },
            }
          ),
          [...ruleTrace, 'except']
        );
      }
      if (parentRuleType !== 'all') {
        throw new RuleBuilderError(
          i18n.translate(
            'xpack.security.management.editRoleMapping.ruleBuilder.exceptOnlyInAllRule',
            {
              defaultMessage: `"except" rule can only exist within an "all" rule.`,
            }
          ),
          [...ruleTrace, ruleType]
        );
      }
      return parseRawRules(ruleDefinition || {}, ruleType, [...ruleTrace, ruleType], depth);
    }
    default:
      throw new RuleBuilderError(
        i18n.translate('xpack.security.management.editRoleMapping.ruleBuilder.unknownRuleType', {
          defaultMessage: `Unknown rule type: {ruleType}.`,
          values: { ruleType },
        }),
        [...ruleTrace, ruleType]
      );
  }
}
