/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepmerge from 'deepmerge';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { ALERT_RULE_UUID, ALERT_RULE_PARAMETERS, TIMESTAMP } from '@kbn/rule-data-utils';
import type { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleAlertData,
  WithoutReservedActionGroups,
} from '../../types';
import type { AlertRule, ReportedAlert } from '../types';
import { stripFrameworkFields } from './strip_framework_fields';

interface BuildAlertOpts<
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  alert: ReportedAlert<
    AlertData,
    LegacyState,
    LegacyContext,
    WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
  >;
  rule: AlertRule;
  timestamp: string;
  status: typeof ALERT_STATUS_ACTIVE | typeof ALERT_STATUS_RECOVERED;
}

/**
 * Builds a new alert document from the LegacyAlert class
 * Currently only populates framework fields and not any rule type specific fields
 */

export const buildAlert = <
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  alert,
  rule,
  timestamp,
  status,
}: BuildAlertOpts<
  AlertData,
  LegacyState,
  LegacyContext,
  ActionGroupIds,
  RecoveryActionGroupId
>): Alert & AlertData => {
  const cleanedPayload = stripFrameworkFields(alert.payload);
  return deepmerge.all(
    [
      cleanedPayload,
      {
        [ALERT_RULE_UUID]: rule[ALERT_RULE_UUID],
        'rule.family_id': rule[ALERT_RULE_PARAMETERS].familyId,
      },
      {
        [TIMESTAMP]: timestamp,
        status,
      },
    ],
    { arrayMerge: (_, sourceArray) => sourceArray }
  ) as Alert & AlertData;
};
