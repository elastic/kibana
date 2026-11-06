/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import type { AlertingDomainEvent, AlertingPublisherContext } from './domain_events';
import type { EventBus, Subscription } from './event_bus';

/**
 * One subscription this subscriber attaches on {@link BaseEventBusSubscriber.start}.
 *
 * It is a closure rather than an `{ eventType, handler }` pair so the
 * correlation between the event type and the handler's narrowed event is
 * preserved end to end: {@link BaseEventBusSubscriber.on} binds a specific
 * `type` to a handler typed for exactly that event, and `start` only has to
 * invoke `attach(bus)`. That keeps every concrete subscriber free of
 * `event as SomeEvent` casts.
 */
export interface EventBusSubscriptionSpec {
  attach(bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>): Subscription;
}

/**
 * Base class for the alerting domain-event bus subscribers.
 *
 * It owns the identical lifecycle every subscriber shares — the idempotent
 * `start()` (guarding against a double subscribe), the bus subscriptions it
 * records, and the `stop()` that unsubscribes them all. Concrete subscribers
 * declare only which events they attach to and the dispatch logic, by
 * implementing {@link getSubscriptions}.
 */
export abstract class BaseEventBusSubscriber {
  #subscriptions: Subscription[] = [];

  protected constructor(
    protected readonly bus: EventBus<AlertingDomainEvent, AlertingPublisherContext>,
    protected readonly logger: LoggerServiceContract
  ) {}

  /**
   * The subscriptions this subscriber attaches on {@link start}. Called once
   * per `start()`; build each one with {@link on} so the handler receives the
   * event narrowed to the subscribed type.
   */
  protected abstract getSubscriptions(): EventBusSubscriptionSpec[];

  /**
   * Binds a single event `type` to a handler typed for exactly that event.
   * `Extract` narrows the domain-event union by the `type` discriminator, so
   * the handler's `event` is the concrete event (e.g. `AlertActionEvent`) with
   * no cast at the call site.
   */
  protected on<K extends AlertingDomainEvent['type']>(
    eventType: K,
    handler: (
      event: Extract<AlertingDomainEvent, { type: K }>,
      context: AlertingPublisherContext
    ) => Promise<void> | void
  ): EventBusSubscriptionSpec {
    return { attach: (bus) => bus.subscribe(eventType, handler) };
  }

  public start(): void {
    if (this.#subscriptions.length > 0) {
      this.logger.debug({
        message: () => 'Subscriber start called more than once; ignoring',
      });

      return;
    }

    for (const spec of this.getSubscriptions()) {
      this.#subscriptions.push(spec.attach(this.bus));
    }
  }

  public stop(): void {
    for (const subscription of this.#subscriptions) {
      subscription.unsubscribe();
    }

    this.#subscriptions = [];
  }
}
