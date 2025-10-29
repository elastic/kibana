/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import deepmerge from 'deepmerge';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_RULE_UUID,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_INSTANCE_ID,
  ALERT_STATUS,
  ALERT_UUID,
  TIMESTAMP,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
} from '@kbn/rule-data-utils';
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
        'rule.query': rule[ALERT_RULE_PARAMETERS].esqlQuery.esql,
        [ALERT_RULE_EXECUTION_UUID]: rule[ALERT_RULE_EXECUTION_UUID],
      },
      {
        [TIMESTAMP]: timestamp,
        [ALERT_INSTANCE_ID]: alert.id,
        [ALERT_STATUS]: status,
        [ALERT_UUID]: uuidv4(),
      },
    ],
    { arrayMerge: (_, sourceArray) => sourceArray }
  ) as Alert & AlertData;
};
