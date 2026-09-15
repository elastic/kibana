/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertInstanceContext, AlertInstanceState } from '../../../common';
import type { Alert } from '../../../alert';

/**
 * Collects non-empty `alert.getContext()` values keyed by both UUID and
 * instance id. Persistence rule types store a SHA of the alert as
 * `kibana.alert.uuid` and as the instance id, while the framework UUID is
 * never written to AAD (https://github.com/elastic/kibana/issues/144862).
 */
export function collectAlertContextByUuid<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  activeAlerts?: Record<string, Alert<State, Context, ActionGroupIds>>,
  recoveredAlerts?: Record<string, Alert<State, Context, RecoveryActionGroupId>>
): Record<string, Context> {
  const contextByAlertUuid: Record<string, Context> = {};

  const addAlert = (alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>) => {
    if (!alert.hasContext()) {
      return;
    }
    const context = alert.getContext();
    contextByAlertUuid[alert.getUuid()] = context;
    contextByAlertUuid[alert.getId()] = context;
  };

  for (const alert of Object.values(activeAlerts ?? {})) {
    addAlert(alert);
  }
  for (const alert of Object.values(recoveredAlerts ?? {})) {
    addAlert(alert);
  }

  return contextByAlertUuid;
}
