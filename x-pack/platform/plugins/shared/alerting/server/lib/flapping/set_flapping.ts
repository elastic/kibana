/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys } from 'lodash';
import type { Alert } from '../../alert';
import type { AlertInstanceState, AlertInstanceContext } from '../../types';
import { isFlapping } from './flapping_utils';
import type { RulesSettingsFlappingProperties } from '../../../common/rules_settings';

export function setFlapping<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupIds extends string
>(
  flappingSettings: RulesSettingsFlappingProperties,
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {},
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {}
) {
  for (const id of keys(activeAlerts)) {
    const alert = activeAlerts[id];
    const flapping = isAlertFlapping(flappingSettings, alert);
    alert.setFlapping(flapping);
  }

  for (const id of keys(recoveredAlerts)) {
    const alert = recoveredAlerts[id];
    const flapping = isAlertFlapping(flappingSettings, alert);
    alert.setFlapping(flapping);
  }
}

/**
 * Recalculates flapping for alerts that stayed recovered, once their flapping history is updated for this run.
 * Only alerts that are already flapping are recalculated, so a recovered alert can stop flapping but not start.
 */
export function setFlappingOnOngoingRecoveredAlerts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext
>(
  flappingSettings: RulesSettingsFlappingProperties,
  ongoingRecoveredAlerts: Record<string, Alert<State, Context>> = {}
): void {
  for (const id of keys(ongoingRecoveredAlerts)) {
    const alert = ongoingRecoveredAlerts[id];
    if (alert.getFlapping()) {
      alert.setFlapping(isAlertFlapping(flappingSettings, alert));
    }
  }
}

export function isAlertFlapping<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  flappingSettings: RulesSettingsFlappingProperties,
  alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>
): boolean {
  const flappingHistory: boolean[] = alert.getFlappingHistory() || [];
  const isCurrentlyFlapping = alert.getFlapping();
  return flappingSettings.enabled
    ? isFlapping(flappingSettings, flappingHistory, isCurrentlyFlapping)
    : false;
}
