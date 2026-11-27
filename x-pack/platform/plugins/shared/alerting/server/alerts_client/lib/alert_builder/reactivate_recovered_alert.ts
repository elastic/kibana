/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, omit } from 'lodash';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_ACTION_GROUP,
  ALERT_END,
  ALERT_PREVIOUS_ACTION_GROUP,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_TIME_RANGE,
} from '@kbn/rule-data-utils';
import type { RuleAlertData } from '../../../types';

/**
 * Turns a recovered alert document back into the active document it was before it recovered.
 */
export const reactivateRecoveredAlert = <AlertData extends RuleAlertData>(
  alert: Alert & AlertData
): Alert & AlertData => {
  const start = get(alert, ALERT_START);
  return {
    ...omit(alert, [ALERT_STATUS, ALERT_ACTION_GROUP, ALERT_END, ALERT_TIME_RANGE]),
    [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
    [ALERT_ACTION_GROUP]: get(alert, ALERT_PREVIOUS_ACTION_GROUP),
    ...(start ? { [ALERT_TIME_RANGE]: { gte: start } } : {}),
  } as Alert & AlertData;
};
