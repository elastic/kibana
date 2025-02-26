/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { Alert } from '../../alert';
import { AlertInstanceState, AlertInstanceContext } from '../../types';
import { RulesSettingsFlappingProperties } from '../../../common/rules_settings';
import { setFlapping } from './set_flapping';
import { categorizeAlertsForFlapping } from './categorize_alerts_for_flapping';
import { dropRecoveredAlerts } from './drop_recovered_alerts';

interface DetermineFlappingAlertsOpts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  logger: Logger;
  newAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
  flappingSettings: RulesSettingsFlappingProperties;
  previouslyRecoveredAlerts: Record<string, Alert<State, Context>>;
  actionGroupId: string;
  maxAlerts: number;
}

export function determineFlappingAlerts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  logger,
  newAlerts,
  activeAlerts,
  recoveredAlerts,
  flappingSettings,
  previouslyRecoveredAlerts,
  actionGroupId,
  maxAlerts,
}: DetermineFlappingAlertsOpts<State, Context, ActionGroupIds, RecoveryActionGroupId>) {
  // Set flapping
  setFlapping<State, Context, ActionGroupIds, RecoveryActionGroupId>(
    flappingSettings,
    activeAlerts,
    recoveredAlerts
  );
  // Loop through alerts to determine which will be used for actions only and which will be tracked in the state
  let alerts = categorizeAlertsForFlapping<State, Context, ActionGroupIds, RecoveryActionGroupId>(
    flappingSettings,
    newAlerts,
    activeAlerts,
    recoveredAlerts,
    previouslyRecoveredAlerts
  );
  // While also updating the flapping settings
  // Trim alerts

  alerts = dropRecoveredAlerts<State, Context, ActionGroupIds, RecoveryActionGroupId>(
    logger,
    flappingSettings,
    actionGroupId,
    maxAlerts,
    alerts.newAlerts,
    alerts.activeAlerts,
    alerts.trackedActiveAlerts,
    alerts.recoveredAlerts,
    alerts.trackedRecoveredAlerts
  );

  return alerts;
}
