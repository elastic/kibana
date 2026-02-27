/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_ACTION_GROUP,
  ALERT_INSTANCE_ID,
  ALERT_CONSECUTIVE_MATCHES,
  ALERT_STATUS,
  ALERT_UUID,
  TIMESTAMP,
  ALERT_STATUS_DELAYED,
  ALERT_RULE_UUID,
  ALERT_RULE_EXECUTION_UUID,
} from '@kbn/rule-data-utils';
import { get } from 'lodash';
import type { Alert as LegacyAlert } from '../../../alert/alert';
import type { AlertInstanceContext, AlertInstanceState, RuleAlertData } from '../../../types';
import type { AlertRule } from '../../types';

interface BuildDelayedAlertOpts<
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  legacyAlert: LegacyAlert<LegacyState, LegacyContext, ActionGroupIds | RecoveryActionGroupId>;
  timestamp: string;
  rule: AlertRule;
}

/**
 * Builds a new alert document from the LegacyAlert class
 * Currently only populates framework fields and not any rule type specific fields
 */

export const buildDelayedAlert = <
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  legacyAlert,
  timestamp,
  rule,
}: BuildDelayedAlertOpts<
  LegacyState,
  LegacyContext,
  ActionGroupIds,
  RecoveryActionGroupId
>): Alert & AlertData => {
  const alertInstanceId = legacyAlert.getId();

  return {
    [ALERT_UUID]: legacyAlert.getUuid(),
    [ALERT_RULE_UUID]: get(rule, ALERT_RULE_UUID),
    [ALERT_RULE_EXECUTION_UUID]: get(rule, ALERT_RULE_EXECUTION_UUID),
    [TIMESTAMP]: timestamp,
    [ALERT_ACTION_GROUP]: legacyAlert.getScheduledActionOptions()?.actionGroup,
    [ALERT_INSTANCE_ID]: alertInstanceId,
    [ALERT_CONSECUTIVE_MATCHES]: legacyAlert.getActiveCount(),
    [ALERT_STATUS]: ALERT_STATUS_DELAYED,
  } as Alert & AlertData;
};
