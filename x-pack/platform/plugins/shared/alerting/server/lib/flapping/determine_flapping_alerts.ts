/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '../../alert';
import type { AlertInstanceState, AlertInstanceContext } from '../../types';
import type { RulesSettingsFlappingProperties } from '../../../common/rules_settings';
import { setFlapping } from './set_flapping';
import { setFlappingHistoryAndTrackedAlerts } from './set_flapping_history_and_tracked_alerts';
import { delayRecoveredFlappingAlerts } from './delay_recovered_flapping_alerts';

interface DetermineFlappingAlertsOpts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  newAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
  flappingSettings: RulesSettingsFlappingProperties;
  previouslyRecoveredAlerts: Record<string, Alert<State, Context>>;
  actionGroupId: string;
}

export function determineFlappingAlerts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  newAlerts,
  activeAlerts,
  recoveredAlerts,
  flappingSettings,
  previouslyRecoveredAlerts,
  actionGroupId,
}: DetermineFlappingAlertsOpts<State, Context, ActionGroupIds, RecoveryActionGroupId>) {
  setFlapping<State, Context, ActionGroupIds, RecoveryActionGroupId>(
    flappingSettings,
    activeAlerts,
    recoveredAlerts
  );

  let alerts = setFlappingHistoryAndTrackedAlerts<
    State,
    Context,
    ActionGroupIds,
    RecoveryActionGroupId
  >(flappingSettings, newAlerts, activeAlerts, recoveredAlerts, previouslyRecoveredAlerts);

  alerts = delayRecoveredFlappingAlerts<State, Context, ActionGroupIds, RecoveryActionGroupId>(
    flappingSettings,
    actionGroupId,
    alerts.newAlerts,
    alerts.activeAlerts,
    alerts.trackedActiveAlerts,
    alerts.recoveredAlerts,
    alerts.trackedRecoveredAlerts
  );

  return alerts;
}
