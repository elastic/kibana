/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';

/**
 * A domain event published on the in-process bus.
 *
 * Events are plain data records keyed by a string `type` discriminator.
 * Implementations should use a discriminated union of concrete events.
 */
export interface DomainEvent {
  readonly type: string;
}

/**
 * Token returned by {@link EventBus.subscribe}. Calling `.unsubscribe()`
 * detaches the handler. Calling it more than once is a no-op.
 */
export interface Subscription {
  unsubscribe(): void;
}

/**
 * Generic in-process pub/sub for alerting domain events.
 *
 * The bus is intentionally minimal:
 *  - `publish` is synchronous from the caller's perspective and never throws.
 *    Handlers are dispatched asynchronously (next microtask) so a publisher
 *    is never blocked or coupled to subscriber latency / errors.
 *  - Each handler is isolated. One handler's failure never affects others.
 *  - Subscribers register by event `type` discriminator and receive the
 *    correctly narrowed event instance.
 */
export interface EventBus<TEvent extends DomainEvent = DomainEvent> {
  publish<E extends TEvent>(event: E): void;

  subscribe<E extends TEvent>(
    type: E['type'],
    handler: (event: E) => Promise<void> | void
  ): Subscription;
}

/**
 * Component that registers handlers on the bus during plugin setup.
 *
 * Subscribers are bound via Inversify multi-binding to
 * {@link EventBusSubscriberToken} and attached once during `OnSetup`.
 */
export interface EventBusSubscriber<TEvent extends DomainEvent = DomainEvent> {
  attach(bus: EventBus<TEvent>): void;
}

/**
 * Inversify token for the singleton {@link EventBus} carrying alerting
 * domain events.
 */
export const EventBusToken = Symbol.for('alerting_v2.EventBus') as ServiceIdentifier<
  EventBus<DomainEvent>
>;

/**
 * Multi-binding token: every subscriber that wants to attach to the bus
 * registers itself under this token. `bind_on_setup` retrieves the full
 * list and attaches each one.
 */
export const EventBusSubscriberToken = Symbol.for(
  'alerting_v2.EventBusSubscriber'
) as ServiceIdentifier<EventBusSubscriber>;
