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
  ALERT_DURATION,
  ALERT_END,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_SEVERITY_IMPROVING,
  ALERT_PREVIOUS_ACTION_GROUP,
  ALERT_RULE_EXECUTION_TIMESTAMP,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_RECOVERED,
  ALERT_TIME_RANGE,
  ALERT_TRACKED,
  EVENT_ACTION,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import type { RawAlertInstance } from '@kbn/alerting-state-types';
import { get, omit } from 'lodash';
import type { RuleAlertData } from '../../types';
import type { AlertRule } from '../types';
import { removeUnflattenedFieldsFromAlert, replaceRefreshableAlertFields } from './format_alert';
import { shouldKeepTrackingRecovered } from '../../lib/flapping/optimize_task_state_for_flapping';
import { nanosToMicros } from './nanos_to_micros';

interface BuildUpdatedRecoveredAlertOpts<AlertData extends RuleAlertData> {
  alert: Alert & AlertData;
  legacyRawAlert: RawAlertInstance;
  runTimestamp?: string;
  timestamp: string;
  rule: AlertRule;
  recoveryActionGroup?: string;
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
  recoveryActionGroup = 'recovered',
}: BuildUpdatedRecoveredAlertOpts<AlertData>): Alert & AlertData => {
  // Make sure that any alert fields that are updatable are flattened.
  const refreshableAlertFields = replaceRefreshableAlertFields(alert);

  // Omit fields that are overwrite-able with undefined value
  const cleanedAlert = omit(alert, ALERT_SEVERITY_IMPROVING);

  const sourceStatus = get(alert, ALERT_STATUS);
  const recoveredState = legacyRawAlert.state;
  const recoveredEnd = recoveredState?.end ?? timestamp;
  const recoveredStart = get(alert, ALERT_START) ?? recoveredState?.start;
  // Task state is the source of truth for recovery. If the original recovered
  // write never landed, close the source doc with the canonical recovery fields.
  const recoveryRepair =
    sourceStatus !== ALERT_STATUS_RECOVERED
      ? {
          [ALERT_STATUS]: ALERT_STATUS_RECOVERED,
          [EVENT_ACTION]: 'close',
          [ALERT_ACTION_GROUP]: recoveryActionGroup,
          [ALERT_END]: recoveredEnd,
          ...(recoveredStart
            ? {
                [ALERT_TIME_RANGE]: {
                  gte: recoveredStart,
                  lte: recoveredEnd,
                },
              }
            : {}),
          ...(recoveredState?.duration
            ? { [ALERT_DURATION]: nanosToMicros(recoveredState.duration) }
            : {}),
        }
      : {};

  const alertUpdates = {
    // Update the timestamp to reflect latest update time
    [TIMESTAMP]: timestamp,
    [ALERT_RULE_EXECUTION_TIMESTAMP]: runTimestamp ?? timestamp,
    // Set latest flapping state
    [ALERT_FLAPPING]: legacyRawAlert.meta?.flapping,
    // Set latest flapping history
    [ALERT_FLAPPING_HISTORY]: legacyRawAlert.meta?.flappingHistory,
    // For an "ongoing recovered" alert, we do not want to update the execution UUID to the current one so it does
    // not get returned for summary alerts.
    [ALERT_RULE_EXECUTION_UUID]: get(alert, ALERT_RULE_EXECUTION_UUID),
    [ALERT_TRACKED]: shouldKeepTrackingRecovered({
      flapping: legacyRawAlert.meta?.flapping,
      flappingHistory: legacyRawAlert.meta?.flappingHistory,
    }),
    [ALERT_PREVIOUS_ACTION_GROUP]: get(alert, ALERT_ACTION_GROUP),
    ...recoveryRepair,
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
