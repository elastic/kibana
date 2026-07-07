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
 * Rest-tuple computed from a bus's `TContext` generic.
 *
 * When `TContext = void` (the default — a bus that publishes events
 * without any publisher-side context) the tuple is empty, so
 * `publish(event)` is the full signature and `subscribe`'s handler is
 * `(event) => …`.
 *
 * When `TContext` is a concrete type (e.g. `{ request: KibanaRequest }`)
 * the tuple becomes `[context: TContext]`, so callers MUST pass it on
 * `publish` and subscribers receive `(event, context) => …`.
 */
export type EventBusContextRest<TContext> = TContext extends void ? [] : [context: TContext];

/**
 * Handler argument tuple for {@link EventBus.subscribe}, computed the
 * same way as {@link EventBusContextRest} so the handler is called with
 * `(event)` when the bus has no context and `(event, context)` when it
 * does.
 */
export type EventBusHandlerArgs<TEvent, TContext> = TContext extends void
  ? [event: TEvent]
  : [event: TEvent, context: TContext];

/**
 * Generic in-process pub/sub for domain events.
 *
 * The bus is intentionally minimal:
 *  - `publish` is synchronous from the caller's perspective and never throws.
 *    Handlers are dispatched asynchronously (next event-loop iteration) so a
 *    publisher is never blocked or coupled to subscriber latency / errors.
 *  - Each handler is isolated. One handler's failure never affects others.
 *  - Subscribers register by event `type` discriminator and receive the
 *    correctly narrowed event instance.
 *
 * `TEvent` is the discriminated union of events this bus carries. `TContext`
 * (default `void`) is the publisher-side metadata threaded through to
 * subscribers. Typically a request-scope handle that subscribers need but
 * the bus itself stays agnostic of. Catalogs that want request scope bind
 * `TContext` to their context shape. Catalogs that don't can leave it
 * defaulted.
 */
export interface EventBus<TEvent extends DomainEvent = DomainEvent, TContext = void> {
  publish<E extends TEvent>(event: E, ...rest: EventBusContextRest<TContext>): void;

  subscribe<E extends TEvent>(
    type: E['type'],
    handler: (...args: EventBusHandlerArgs<E, TContext>) => Promise<void> | void
  ): Subscription;
}

/**
 * Component that registers handlers on the bus during plugin setup.
 *
 * Subscribers are bound via Inversify multi-binding to
 * {@link EventBusSubscriberToken} and attached once during `OnSetup`.
 */
export interface EventBusSubscriber<TEvent extends DomainEvent = DomainEvent, TContext = void> {
  attach(bus: EventBus<TEvent, TContext>): void;
}

/**
 * Multi-binding token: every subscriber that wants to attach to the bus
 * registers itself under this token. `bind_on_setup` retrieves the full
 * list and attaches each one.
 */
export const EventBusSubscriberToken = Symbol.for(
  'alerting_v2.EventBusSubscriber'
) as ServiceIdentifier<EventBusSubscriber>;
