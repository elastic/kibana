/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  alertActionActorType,
  type AlertActionDocument,
} from '../../../../resources/datastreams/alert_actions';
import type { ActionGroup, ActionPolicy, Alert } from '../../types';

export function toAction({
  alert,
  actionType,
  reason,
  spaceId,
}: {
  alert: Alert;
  actionType: 'suppress' | 'fire' | 'notified' | 'unmatched';
  reason?: string;
  spaceId: string;
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
  };
}

/**
 * Builds one `notified` record per alert of a dispatched group. The record is keyed by
 * (`action_group_id`, `alert_id`) and stamped with the alert's event time so the
 * already-notified guard can tell, on a later tick, which content the group already delivered.
 */
export const toNotifiedActions = (
  group: ActionGroup,
  groupingMode: ActionPolicy['groupingMode']
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
