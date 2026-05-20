/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Catalog of every domain event that alerting framework publishes on its in-process
 * event bus.
 *
 * This module is the single import point for code that needs to talk about
 * "alerting framework events" as a whole (e.g. when typing `EventBus<...>` or
 * `EventBusSubscriber<...>`). It re-exports each publisher's event types and
 * exposes the {@link AlertingDomainEvent} discriminated union.
 *
 * New publishers (e.g. the rule executor or dispatcher) should:
 *  1. Define their concrete event type and runtime `*_TYPE` constant inside
 *     their own domain folder (alongside the code that publishes it).
 *  2. Add a re-export here.
 *  3. Extend the {@link AlertingDomainEvent} union below.
 */

import type { ServiceIdentifier } from 'inversify';
import type { EventBus } from '../event_bus';
import type { AlertActionEvent } from '../alert_action_event_publisher/events';

export type {
  AlertActionEvent,
  AlertActionEventEnvelope,
  BaseAlertActionEvent,
  EpisodeAssignedEvent,
  EpisodeAssignedPayload,
} from '../alert_action_event_publisher/events';
export { EPISODE_ASSIGNED_EVENT_TYPE } from '../alert_action_event_publisher/events';

/**
 * Discriminated union of every domain event the alerting framework publishes
 * on its event bus.
 *
 * Composed from per-subdomain unions so each subdomain owns its own catalog
 * (and its own envelope shape if it diverges). Today only the alert-action
 * subdomain publishes. Future subdomains (rule executor, dispatcher) extend
 * this union by adding their own sub-union here.
 */
export type AlertingDomainEvent = AlertActionEvent;

/**
 * Inversify token for the singleton {@link EventBus} carrying every
 * {@link AlertingDomainEvent}.
 *
 * Typed against the {@link AlertingDomainEvent} discriminated union so that
 * subscribers receive a fully-narrowed event in their handler:
 *
 * ```ts
 * constructor(@inject(AlertingDomainEventBusToken)
 *             private readonly bus: EventBus<AlertingDomainEvent>) {}
 *
 * this.bus.subscribe('episode.assigned', (event) => {
 *   // `event` is `EpisodeAssignedEvent` here — no cast needed.
 * });
 * ```
 *
 * Publishers can rely on the same narrowing on their `publish` call. The
 * generic `EventBus<TEvent>` interface is contravariant in `TEvent` at its
 * input positions, so the underlying `AsyncDomainEventBus` singleton
 * (declared as `<DomainEvent>` by default) safely satisfies this narrower
 * contract.
 */
export const AlertingDomainEventBusToken = Symbol.for(
  'alerting_v2.AlertingDomainEventBus'
) as ServiceIdentifier<EventBus<AlertingDomainEvent>>;
