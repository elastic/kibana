/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { RoleMapping } from '../../../../../common/model';
import { FieldRule, FieldRuleValue } from './field_rule';
import { AllRule } from './all_rule';
import { AnyRule } from './any_rule';
import { Rule } from './rule';
import { ExceptFieldRule } from './except_field_rule';
import { ExceptAllRule } from './except_all_rule';
import { ExceptAnyRule } from './except_any_rule';

/**
 * Describes an error during rule building.
 * In addition to a user-"friendly" message, this also includes a rule trace,
 * which is the "JSON path" where the error occurred.
 */
export class RuleBuilderError extends Error {
  constructor(message: string, public readonly ruleTrace: string[]) {
    super(message);

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, RuleBuilderError.prototype);
  }
}

interface RuleBuilderResult {
  /** The maximum rule depth within the parsed rule set. */
  maxDepth: number;

  /** The parsed rule set. */
  rules: Rule | null;
}

/**
 * Given a set of raw rules, this constructs a class based tree for consumption by the Role Management UI.
 * This also performs validation on the raw rule set, as it is possible to enter raw JSON in the JSONRuleEditor,
 * so we have no guarantees that the rule set is valid ahead of time.
 *
 * @param rawRules the raw rules to translate.
 */
export function generateRulesFromRaw(rawRules: RoleMapping['rules'] = {}): RuleBuilderResult {
  return parseRawRules(rawRules, null, [], 0);
}

function parseRawRules(
  rawRules: RoleMapping['rules'],
  parentRuleType: string | null,
  ruleTrace: string[],
  depth: number
): RuleBuilderResult {
  const entries = Object.entries(rawRules);
  if (!entries.length) {
    return {
      rules: null,
      maxDepth: 0,
    };
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
            'xpack.security.management.editRoleMapping.ruleBuilder.expectedSingleFieldRule',
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
        if (fieldValue !== null && !['string', 'number', 'boolean'].includes(valueType)) {
          throw new RuleBuilderError(
            i18n.translate(
              'xpack.security.management.editRoleMapping.ruleBuilder.invalidFieldValueType',
              {
                defaultMessage: `Invalid value type for field. Expected one of null, string, number, or boolean, but found {valueType} ({value}).`,
                values: { valueType, value: JSON.stringify(value) },
              }
            ),
            [...ruleTrace, `field[${field}]`]
          );
        }
      });

      const fieldRule = new FieldRule(field, value);
      return {
        rules: isRuleNegated ? new ExceptFieldRule(fieldRule) : fieldRule,
        maxDepth: depth,
      };
    }
    case 'any': // intentional fall-through to 'all', as validation logic is identical
    case 'all': {
      if (ruleDefinition != null && !Array.isArray(ruleDefinition)) {
        throw new RuleBuilderError(
          i18n.translate(
            'xpack.security.management.editRoleMapping.ruleBuilder.expectedArrayForGroupRule',
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

      if (ruleType === 'all') {
        return {
          rules: isRuleNegated ? new ExceptAllRule(subRules) : new AllRule(subRules),
          maxDepth,
        };
      } else {
        return {
          rules: isRuleNegated ? new ExceptAnyRule(subRules) : new AnyRule(subRules),
          maxDepth,
        };
      }
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
      // subtracting 1 from depth because we don't currently count the "except" level itself as part of the depth calculation
      // for the purpose of determining if the rule set is "too complex" for the visual rule editor.
      // The "except" rule MUST be nested within an "all" rule type (see validation above), so the depth itself will always be a non-negative number.
      return parseRawRules(ruleDefinition || {}, ruleType, [...ruleTrace, ruleType], depth - 1);
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
