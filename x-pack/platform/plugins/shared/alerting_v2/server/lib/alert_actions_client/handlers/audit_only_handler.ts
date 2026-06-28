/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisodeActionType, CreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import type { ActionHandler } from '../handler';

type AuditOnlyHandler<T extends AlertEpisodeActionType> = ActionHandler<
  Extract<CreateAlertActionBody, { action_type: T }>,
  unknown
>;

/**
 * Factory for the audit-only handler shape: an action that records the
 * audit `.alert-actions` doc the orchestrator already built and nothing
 * else (no preconditions, no synthetic `.rule-events`, no preload). Most
 * non-lifecycle actions — `ack`, `unack`, `assign`, `tag`, `snooze`,
 * `unsnooze` — fall into this category, so collapsing their boilerplate
 * into one factory keeps each per-action file to a single line and
 * makes registry registration explicit and exhaustive.
 *
 * The handler returns the precomputed `alertActionDoc` verbatim; any
 * future per-action audit-doc decoration should happen at the
 * orchestrator's `buildAlertActionDocument` step, not here, so audit
 * shape stays uniform across action types.
 */
export const createAuditOnlyHandler = <T extends AlertEpisodeActionType>(
  actionType: T
): AuditOnlyHandler<T> => ({
  actionType: actionType as AuditOnlyHandler<T>['actionType'],
  prepare: (_item, { alertActionDoc }) => ({ alertActionDoc }),
});
