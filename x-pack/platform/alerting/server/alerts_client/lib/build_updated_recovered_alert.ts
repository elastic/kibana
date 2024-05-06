/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepmerge from 'deepmerge';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { ALERT_FLAPPING, ALERT_FLAPPING_HISTORY, TIMESTAMP } from '@kbn/rule-data-utils';
import { RawAlertInstance } from '@kbn/alerting-state-types';
import { RuleAlertData } from '../../types';
import { AlertRule } from '../types';
import { removeUnflattenedFieldsFromAlert, replaceRefreshableAlertFields } from './format_alert';

interface BuildUpdatedRecoveredAlertOpts<AlertData extends RuleAlertData> {
  alert: Alert & AlertData;
  legacyRawAlert: RawAlertInstance;
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
  rule,
  timestamp,
}: BuildUpdatedRecoveredAlertOpts<AlertData>): Alert & AlertData => {
  // Make sure that any alert fields that are updateable are flattened.
  const refreshableAlertFields = replaceRefreshableAlertFields(alert);

  const alertUpdates = {
    // Set latest rule configuration
    ...rule,
    // Update the timestamp to reflect latest update time
    [TIMESTAMP]: timestamp,
    // Set latest flapping state
    [ALERT_FLAPPING]: legacyRawAlert.meta?.flapping,
    // Set latest flapping history
    [ALERT_FLAPPING_HISTORY]: legacyRawAlert.meta?.flappingHistory,
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
  const cleanedAlert = removeUnflattenedFieldsFromAlert(alert, {
    ...alertUpdates,
    ...refreshableAlertFields,
  });

  return deepmerge.all([cleanedAlert, refreshableAlertFields, alertUpdates], {
    arrayMerge: (_, sourceArray) => sourceArray,
  }) as Alert & AlertData;
};
