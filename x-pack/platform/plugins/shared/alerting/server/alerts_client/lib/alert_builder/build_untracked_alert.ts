/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepmerge from 'deepmerge';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_END,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_UNTRACKED,
  ALERT_TIME_RANGE,
  ALERT_TRACKED,
} from '@kbn/rule-data-utils';
import { get } from 'lodash';
import type { RuleAlertData } from '../../../types';
import { removeUnflattenedFieldsFromAlert } from '../format_alert';

interface BuildUntrackedAlertOpts<AlertData extends RuleAlertData> {
  alert: Alert & AlertData;
  timestamp: string;
}

/**
 * Closes an alert document the rule no longer tracks, writing the same fields as a manual untrack.
 */
export const buildUntrackedAlert = <AlertData extends RuleAlertData>({
  alert,
  timestamp,
}: BuildUntrackedAlertOpts<AlertData>): Alert & AlertData => {
  const timeRangeStart = get(alert, ALERT_TIME_RANGE)?.gte ?? get(alert, ALERT_START);

  const alertUpdates = {
    [ALERT_STATUS]: ALERT_STATUS_UNTRACKED,
    [ALERT_END]: timestamp,
    [ALERT_TRACKED]: false,
    ...(timeRangeStart ? { [ALERT_TIME_RANGE]: { gte: timeRangeStart, lte: timestamp } } : {}),
  };

  // Some rule types write these fields nested. Drop the nested copy so the document does not
  // end up with both versions.
  const expandedAlert = removeUnflattenedFieldsFromAlert(alert, alertUpdates);

  return deepmerge.all([expandedAlert, alertUpdates], {
    arrayMerge: (_, sourceArray) => sourceArray,
  }) as Alert & AlertData;
};
