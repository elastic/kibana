/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '../../alert';
import type { AlertInstanceState, AlertInstanceContext } from '../../types';
import { updateFlappingHistory } from './flapping_utils';
import type { RulesSettingsFlappingProperties } from '../../../common/rules_settings';

export function updateAlertFlappingHistory<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  flappingSettings: RulesSettingsFlappingProperties,
  alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>,
  state: boolean
) {
  const updatedFlappingHistory = updateFlappingHistory(
    flappingSettings,
    alert.getFlappingHistory() || [],
    state
  );
  alert.setFlappingHistory(updatedFlappingHistory);
}
