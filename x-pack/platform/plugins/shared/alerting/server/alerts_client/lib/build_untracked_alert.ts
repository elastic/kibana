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
import moment from 'moment';
import type { RuleAlertData } from '../../types';
import { removeUnflattenedFieldsFromAlert } from './format_alert';

interface BuildUntrackedAlertOpts<AlertData extends RuleAlertData> {
  alert: Alert & AlertData;
  timestamp: string;
}

const parseRangeStart = (value: string | number): number => {
  // The range mapping tries epoch_millis first and treats ISO dates without an offset as UTC.
  if (/^-?\d+(?:\.\d+)?$/.test(String(value))) {
    return new Date(Math.floor(Number(value))).getTime();
  }
  return moment.utc(value, moment.ISO_8601, true).valueOf();
};

/**
 * Closes an alert document the rule no longer tracks, writing the same fields as a manual untrack.
 */
export const buildUntrackedAlert = <AlertData extends RuleAlertData>({
  alert,
  timestamp,
}: BuildUntrackedAlertOpts<AlertData>): Alert & AlertData => {
  const timeRangeStart = get(alert, ALERT_TIME_RANGE)?.gte ?? get(alert, ALERT_START);
  const startMillis = timeRangeStart == null ? NaN : parseRangeStart(timeRangeStart);
  // Elasticsearch rejects a time range that ends before it starts. An alert that starts after
  // the timestamp, for example because another node's clock is ahead, ends at its own start.
  const end = startMillis > Date.parse(timestamp) ? new Date(startMillis).toISOString() : timestamp;

  const alertUpdates = {
    [ALERT_STATUS]: ALERT_STATUS_UNTRACKED,
    [ALERT_END]: end,
    [ALERT_TRACKED]: false,
    ...(timeRangeStart != null ? { [ALERT_TIME_RANGE]: { gte: timeRangeStart, lte: end } } : {}),
  };

  // Some rule types write these fields nested. Drop the nested copy so the document does not
  // end up with both versions.
  const expandedAlert = removeUnflattenedFieldsFromAlert(alert, alertUpdates);

  return deepmerge.all([expandedAlert, alertUpdates], {
    arrayMerge: (_, sourceArray) => sourceArray,
  }) as Alert & AlertData;
};
