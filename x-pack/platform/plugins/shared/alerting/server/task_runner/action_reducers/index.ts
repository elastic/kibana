/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Alert } from '../../alert';
import { AlertInstanceContext, AlertInstanceState } from '../../../common';
import { ReducerOpts } from './types';
import { reduceFlappingAlerts } from './flapping';
import { reduceAlertsUnderMaintenance } from './maintenance';
import { reduceAlertsWhenRuleMuted } from './rule_muted';
import { reduceMutedAlerts } from './rule_alert_muted';
import { reduceAlertsWhenRuleSnoozed } from './snooze';

// Add your reducer here and that's it
const reducers = [
  reduceFlappingAlerts,
  reduceAlertsUnderMaintenance,
  reduceAlertsWhenRuleMuted,
  reduceMutedAlerts,
  reduceAlertsWhenRuleSnoozed,
];

export function reduceAlertsForActions<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext
>(opts: ReducerOpts<State, Context>) {
  let result: Array<Alert<State, Context>> = opts.alerts;
  for (const reducer of reducers) {
    result = reducer({ ...opts, alerts: result });
  }
  return result;
}
