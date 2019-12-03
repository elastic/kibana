/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  RoleMappingRule,
  RuleMappingRuleType,
  RoleMappingExceptRule,
} from '../../../../../../common/model';

interface RuleTypeDescriptor {
  type: RuleMappingRuleType;
  isGroup: boolean;
  isExceptType: boolean;
  title: string;
  defaultValue: any;
}

export const ruleTypes = new Map(
  Object.entries({
    field: {
      type: 'field',
      isGroup: false,
      isExceptType: false,
      title: 'foo',
      defaultValue: {
        field: { username: '*' },
      },
    },
    all: {
      type: 'all',
      isGroup: true,
      isExceptType: false,
      title: 'All of the following are true',
      defaultValue: {
        all: [],
      },
    },
    any: {
      type: 'any',
      isGroup: true,
      isExceptType: false,
      title: 'Any of the following are true',
      defaultValue: {
        any: [],
      },
    },
    exceptAll: {
      type: 'exceptAll',
      isGroup: true,
      isExceptType: true,
      title: 'Any of the following are false',
      defaultValue: {
        except: {
          all: [],
        },
      },
    },
    exceptAny: {
      type: 'exceptAny',
      isGroup: true,
      isExceptType: true,
      title: 'None of the following are true',
      defaultValue: {
        except: {
          any: [],
        },
      },
    },
    exceptField: {
      type: 'exceptField',
      isGroup: true,
      isExceptType: true,
      title: 'The following is false',
      defaultValue: {
        except: {
          field: {
            username: '*',
          },
        },
      },
    },
  })
) as ReadonlyMap<RuleMappingRuleType, RuleTypeDescriptor>;

export const getRuleType = (rule: RoleMappingRule): RuleTypeDescriptor => {
  if (rule.hasOwnProperty('field')) {
    return ruleTypes.get('field')!;
  }
  if (rule.hasOwnProperty('all')) {
    return ruleTypes.get('all')!;
  }
  if (rule.hasOwnProperty('any')) {
    return ruleTypes.get('any')!;
  }
  if (rule.hasOwnProperty('except')) {
    const exceptRule = rule as RoleMappingExceptRule;
    const { type } = getRuleType(exceptRule.except);
    switch (type) {
      case 'all':
        return ruleTypes.get('exceptAll')!;
      case 'any':
        return ruleTypes.get('exceptAny')!;
      case 'field':
        return ruleTypes.get('exceptField')!;
      default:
        throw new Error(`Unsupported except rule: ${type}`);
    }
  }
  throw new Error(`Unable to determine rule type for rule ${JSON.stringify(rule)}`);
};
