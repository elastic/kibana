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
 * One handler attached to the bus: the event type to listen for and the handler
 * to invoke. Returned by {@link BaseEventBusSubscriber.getSubscriptions}.
 */
export interface EventBusSubscriptionSpec {
  eventType: AlertingDomainEvent['type'];
  handler: (event: AlertingDomainEvent, context: AlertingPublisherContext) => Promise<void> | void;
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
   * The event-type/handler pairs this subscriber attaches on {@link start}.
   * Called once per `start()`; handlers typically close over the subscriber's
   * own dispatch method (and any per-event trigger metadata).
   */
  protected abstract getSubscriptions(): EventBusSubscriptionSpec[];

  public start(): void {
    if (this.#subscriptions.length > 0) {
      this.logger.debug({
        message: () => 'Subscriber start called more than once; ignoring',
      });

      return;
    }

    for (const { eventType, handler } of this.getSubscriptions()) {
      this.#subscriptions.push(this.bus.subscribe(eventType, handler));
    }
  }

  public stop(): void {
    for (const subscription of this.#subscriptions) {
      subscription.unsubscribe();
    }

    this.#subscriptions = [];
  }
}
