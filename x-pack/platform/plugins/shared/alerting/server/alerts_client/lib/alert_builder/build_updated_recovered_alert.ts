/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepmerge from 'deepmerge';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_ACTION_GROUP,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_MUTED,
  ALERT_SEVERITY_IMPROVING,
  ALERT_PREVIOUS_ACTION_GROUP,
  ALERT_RULE_EXECUTION_TIMESTAMP,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_SNOOZE_CONDITION_OPERATOR,
  ALERT_SNOOZE_CONDITIONS,
  ALERT_SNOOZE_EXPIRES_AT,
  ALERT_SNOOZE_SNAPSHOT,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import type { RawAlertInstance } from '@kbn/alerting-state-types';
import { get, omit } from 'lodash';
import type { RuleAlertData } from '../../../types';
import type { AlertRule } from '../../types';
import { removeUnflattenedFieldsFromAlert, replaceRefreshableAlertFields } from '../format_alert';

interface BuildUpdatedRecoveredAlertOpts<AlertData extends RuleAlertData> {
  alert: Alert & AlertData;
  legacyRawAlert: RawAlertInstance;
  runTimestamp?: string;
  timestamp: string;
  rule: AlertRule;
}

/**
 * Updates an existing recovered alert document with latest flapping
 * information
 */

export const buildUpdatedRecoveredAlert = <AlertData extends RuleAlertData>({
  alert,
  legacyRawAlert,
  runTimestamp,
  timestamp,
}: BuildUpdatedRecoveredAlertOpts<AlertData>): Alert & AlertData => {
  // Make sure that any alert fields that are updatable are flattened.
  const refreshableAlertFields = replaceRefreshableAlertFields(alert);

  // Omit fields that are overwrite-able with undefined value
  const cleanedAlert = omit(alert, ALERT_SEVERITY_IMPROVING);

  // Clear snooze fields if the time-based TTL has now expired during the recovery phase.
  // Condition-based snoozes are NOT auto-cleared here because condition evaluation requires
  // in-memory alert data that is not available for recovered alerts. They will be evaluated
  // when the alert re-activates via isAlertMuted() in the action scheduler.
  const snoozeExpiresAt = get(alert, ALERT_SNOOZE_EXPIRES_AT) as string | undefined;
  const ttlExpiredDuringRecovery =
    snoozeExpiresAt != null && new Date(snoozeExpiresAt).getTime() <= Date.now();

  const alertUpdates = {
    // Update the timestamp to reflect latest update time
    [TIMESTAMP]: timestamp,
    [ALERT_RULE_EXECUTION_TIMESTAMP]: runTimestamp ?? timestamp,
    // Set latest flapping state
    [ALERT_FLAPPING]: legacyRawAlert.meta?.flapping,
    // Set latest flapping history
    [ALERT_FLAPPING_HISTORY]: legacyRawAlert.meta?.flappingHistory,
    // For an "ongoing recovered" alert, we do not want to update the execution UUID to the current one so it does
    // not get returned for summary alerts. In the future, we may want to restore this and add another field to the
    // alert doc indicating that this is an ongoing recovered alert that can be used for querying.
    [ALERT_RULE_EXECUTION_UUID]: get(alert, ALERT_RULE_EXECUTION_UUID),
    [ALERT_PREVIOUS_ACTION_GROUP]: get(alert, ALERT_ACTION_GROUP),
    // If TTL expired during the recovery phase, clear snooze state so the doc accurately
    // reflects that the snooze is no longer active the next time the alert is fetched.
    ...(ttlExpiredDuringRecovery
      ? {
          [ALERT_MUTED]: false,
          [ALERT_SNOOZE_EXPIRES_AT]: undefined,
          [ALERT_SNOOZE_CONDITIONS]: undefined,
          [ALERT_SNOOZE_CONDITION_OPERATOR]: undefined,
          [ALERT_SNOOZE_SNAPSHOT]: undefined,
        }
      : {}),
  };

  // Clean the existing alert document so any nested fields that will be updated
  // are removed, to avoid duplicate data.
  // e.g. if the existing alert document has the field:
  // {
  //   kibana: {
  //     alert: {
  //       field1: 'value1'
  //     }
  //   }
  // }
  // and the updated alert has the field
  // {
  //   'kibana.alert.field1': 'value2'
  // }
  // the expanded field from the existing alert is removed
  const expandedAlert = removeUnflattenedFieldsFromAlert(cleanedAlert, {
    ...alertUpdates,
    ...refreshableAlertFields,
  });

  return deepmerge.all([expandedAlert, refreshableAlertFields, alertUpdates], {
    arrayMerge: (_, sourceArray) => sourceArray,
  }) as Alert & AlertData;
};
