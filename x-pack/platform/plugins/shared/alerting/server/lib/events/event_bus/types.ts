/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A domain event published on the in-process bus.
 * Events are plain data records keyed by a string `type` discriminator.
 */
export interface DomainEvent {
  readonly type: string;
}

/** Token returned by {@link EventBus.subscribe}. */
export interface Subscription {
  unsubscribe(): void;
}

/**
 * Rest-tuple computed from a bus's `TContext` generic.
 * When `TContext = void` the tuple is empty. When `TContext` is a concrete
 * type the tuple is `[context: TContext]`.
 */
export type EventBusContextRest<TContext> = TContext extends void ? [] : [context: TContext];

/**
 * Handler argument tuple for {@link EventBus.subscribe}.
 */
export type EventBusHandlerArgs<TEvent, TContext> = TContext extends void
  ? [event: TEvent]
  : [event: TEvent, context: TContext];

/**
 * Generic in-process pub/sub for domain events.
 *
 * `publish` is synchronous from the caller's perspective and never throws.
 * Handlers are dispatched asynchronously (next event-loop iteration) so the
 * publisher is never blocked by subscriber work.
 * Each handler is isolated — one handler's failure never affects others.
 */
export interface EventBus<TEvent extends DomainEvent = DomainEvent, TContext = void> {
  publish<E extends TEvent>(event: E, ...rest: EventBusContextRest<TContext>): void;

  subscribe<E extends TEvent>(
    type: E['type'],
    handler: (...args: EventBusHandlerArgs<E, TContext>) => Promise<void> | void
  ): Subscription;
}
