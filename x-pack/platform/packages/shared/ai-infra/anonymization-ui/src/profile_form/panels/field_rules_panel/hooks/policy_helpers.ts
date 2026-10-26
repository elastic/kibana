/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldRule } from '@kbn/anonymization-common';
import {
  FIELD_RULE_ACTION_ALLOW,
  FIELD_RULE_ACTION_ANONYMIZE,
  type FieldRuleAction,
} from '../../../hooks/field_rule_actions';
import { toFieldAction } from '../../../constants';

export interface PolicyCounters {
  allow: number;
  anonymize: number;
  deny: number;
}

export const countPolicies = (rules: FieldRule[]): PolicyCounters =>
  rules.reduce<PolicyCounters>(
    (accumulator, rule) => {
      const action = toFieldAction(rule);
      if (action === FIELD_RULE_ACTION_ALLOW) {
        accumulator.allow += 1;
      } else if (action === FIELD_RULE_ACTION_ANONYMIZE) {
        accumulator.anonymize += 1;
      } else {
        accumulator.deny += 1;
      }
      return accumulator;
    },
    { allow: 0, anonymize: 0, deny: 0 }
  );

export const toActionOption = (value: FieldRuleAction, label: string) => ({
  id: value,
  label,
});
