/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Catalog of every domain event that alerting-v2 publishes on its in-process
 * event bus.
 *
 * This module is the single import point for code that needs to talk about
 * "alerting-v2 events" as a whole (e.g. when typing `EventBus<...>` or
 * `EventBusSubscriber<...>`). It re-exports each publisher's event types and
 * exposes the {@link AlertingDomainEvent} discriminated union.
 *
 * New publishers (e.g. the rule executor or dispatcher) should:
 *  1. Define their concrete event type and runtime `*_TYPE` constant inside
 *     their own domain folder (alongside the code that publishes it).
 *  2. Add a re-export here.
 *  3. Extend the {@link AlertingDomainEvent} union below.
 *
 * The {@link ../event_bus} folder is intentionally generic and MUST NOT
 * import from this file; it knows only about the base {@link DomainEvent}.
 */

import type { AlertActionPersistedEvent } from '../../alert_actions_client/events';

export type {
  AlertActionEventRecord,
  AlertActionPersistedEvent,
} from '../../alert_actions_client/events';
export { ALERT_ACTION_PERSISTED_EVENT_TYPE } from '../../alert_actions_client/events';

/**
 * Discriminated union of every domain event alerting-v2 publishes on its bus.
 * Extend this when a new publisher is introduced.
 */
export type AlertingDomainEvent = AlertActionPersistedEvent;
