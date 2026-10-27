/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  alertActionActorType,
  type AlertActionDocument,
  type AlertActionSubtype,
} from '../../../../resources/datastreams/alert_actions';
import type { ActionGroup, ActionPolicy, Alert } from '../../types';

export function toAction({
  alert,
  actionType,
  actionSubtype,
  reason,
  spaceId,
  maintenanceWindowId,
}: {
  alert: Alert;
  actionType: 'suppress' | 'fire' | 'notified' | 'unmatched';
  actionSubtype?: AlertActionSubtype;
  reason?: string;
  spaceId: string;
  maintenanceWindowId?: string;
}): AlertActionDocument {
  return {
    group_hash: alert.group_hash,
    last_series_event_timestamp: alert.last_event_timestamp,
    actor: { type: alertActionActorType.internal },
    action_type: actionType,
    rule_id: alert.rule_id,
    source: alert.source,
    reason,
    space_id: spaceId,
    ...(actionSubtype !== undefined && { action_subtype: actionSubtype }),
    ...(maintenanceWindowId !== undefined && { maintenance_window_id: maintenanceWindowId }),
  };
}

/**
 * Builds one `notified` record per alert of a concluded group: its workflows were scheduled, or
 * their scheduling failed (license, API key, workflow lookup, schedule error). The record is keyed
 * by (`action_group_id`, `alert_id`) and stamped with the alert's event time so the
 * already-notified guard can tell, on a later tick, which content the group already handled.
 */
export const toNotifiedActions = (
  group: ActionGroup,
  groupingMode: ActionPolicy['grouping']['mode']
): AlertActionDocument[] =>
  group.alerts.map((alert) => ({
    ...toAction({
      alert,
      actionType: 'notified',
      reason: `notified by policy ${group.policyId}`,
      spaceId: alert.space_id,
    }),
    action_group_id: group.id,
    alert_id: alert.alert_id,
    ...(groupingMode === 'per_alert' ? { alert_status: alert.alert_status } : {}),
  }));
