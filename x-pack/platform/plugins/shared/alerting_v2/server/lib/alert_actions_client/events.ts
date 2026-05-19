/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkCreateAlertActionItemBody,
  CreateAlertActionBody,
} from '@kbn/alerting-v2-schemas';

/**
 * Minimal projection of an alert event needed by downstream consumers
 * of {@link AlertActionPersistedEvent}.
 *
 * Kept structural (not a class) so the event remains a plain data record
 * suitable for serialisation if a future outbox subscriber needs it.
 */
export interface AlertActionEventRecord {
  '@timestamp': string;
  group_hash: string;
  episode_id: string;
  rule_id: string;
  space_id: string;
}

/**
 * Domain event published by {@link AlertActionsClient} after an action
 * has been successfully persisted to the alert-actions data stream.
 *
 * Carries:
 *  - the persisted action (single or bulk-item shape),
 *  - the matching alert event record at persistence time,
 *  - `actorUid` — the user profile UID of the caller, or null if the
 *    action was performed by an internal/system context. This is
 *    semantic data (who did this) and is independent of the request
 *    that may have produced it.
 *  - `persistedAt` — ISO timestamp of persistence.
 */
export interface AlertActionPersistedEvent {
  readonly type: 'alert_action.persisted';
  readonly action: CreateAlertActionBody | BulkCreateAlertActionItemBody;
  readonly alertEvent: AlertActionEventRecord;
  readonly actorUid: string | null;
  readonly persistedAt: string;
}

export const ALERT_ACTION_PERSISTED_EVENT_TYPE: AlertActionPersistedEvent['type'] =
  'alert_action.persisted';
