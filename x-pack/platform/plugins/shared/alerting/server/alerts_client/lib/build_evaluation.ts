/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepmerge from 'deepmerge';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { ALERT_RULE_UUID, ALERT_RULE_PARAMETERS, TIMESTAMP } from '@kbn/rule-data-utils';
import type { AlertInstanceContext, AlertInstanceState, RuleAlertData } from '../../types';
import type { AlertRule } from '../types';

interface BuildEvalutaionOpts<
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  rule: AlertRule;
  timestamp: string;
  ruleRunCount: number;
}

export const buildEvaluation = <
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  rule,
  timestamp,
  ruleRunCount,
}: BuildEvalutaionOpts<
  AlertData,
  LegacyState,
  LegacyContext,
  ActionGroupIds,
  RecoveryActionGroupId
>): Alert & AlertData => {
  return deepmerge.all(
    [
      {
        [ALERT_RULE_UUID]: rule[ALERT_RULE_UUID],
        'rule.parent_id': rule[ALERT_RULE_PARAMETERS].parentId,
        'run.id': ruleRunCount,
      },
      {
        [TIMESTAMP]: timestamp,
      },
    ],
    { arrayMerge: (_, sourceArray) => sourceArray }
  ) as Alert & AlertData;
};
