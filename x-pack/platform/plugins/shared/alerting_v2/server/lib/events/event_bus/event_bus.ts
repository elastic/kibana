/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitter } from 'node:events';
import { inject, injectable } from 'inversify';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type { DomainEvent, EventBus, Subscription } from './types';

type AnyHandler = (event: DomainEvent) => Promise<void> | void;

/**
 * Default {@link EventBus} implementation.
 *
 * Behaviour:
 *  - `publish` validates the event has a `type` field and dispatches each
 *    listener on the next microtask via `queueMicrotask`. The publisher's
 *    call stack returns synchronously and is never blocked by handler work.
 *  - Each handler is invoked inside its own try/catch; a thrown handler
 *    (sync throw or rejected promise) is logged but never bubbles up nor
 *    prevents the other handlers from running.
 *  - Backed by Node's built-in {@link EventEmitter}; no per-handler
 *    bookkeeping is kept here.
 *  - The bus owns no per-event state; replays/persistence are out of scope
 *    (see follow-up "outbox" subscriber for durability).
 */
@injectable()
export class AlertingDomainEventBus<TEvent extends DomainEvent = DomainEvent>
  implements EventBus<TEvent>
{
  readonly #emitter = new EventEmitter();

  constructor(@inject(LoggerServiceToken) private readonly logger: LoggerServiceContract) {
    // We own subscriber count via DI; disable the listener-count warning.
    this.#emitter.setMaxListeners(0);
  }

  public publish<E extends TEvent>(event: E): void {
    if (!event || typeof event.type !== 'string') {
      this.logger.warn({
        message: () =>
          `[alerting_v2.EventBus] Refused to publish event without a string \`type\` discriminator.`,
      });
      return;
    }

    this.#emitter.emit(event.type, event);
  }

  public subscribe<E extends TEvent>(
    type: E['type'],
    handler: (event: E) => Promise<void> | void
  ): Subscription {
    const wrapped: AnyHandler = (event) => {
      queueMicrotask(async () => {
        try {
          await handler(event as E);
        } catch (err) {
          this.#logHandlerError(event, err);
        }
      });
    };
    this.#emitter.on(type, wrapped);

    let active = true;
    return {
      unsubscribe: () => {
        if (!active) return;
        active = false;
        this.#emitter.off(type, wrapped);
      },
    };
  }

  #logHandlerError(event: DomainEvent, err: unknown): void {
    const error = err instanceof Error ? err : new Error(String(err));
    this.logger.error({
      error,
      code: 'EVENT_BUS_HANDLER_FAILURE',
      type: `EventBus:${event.type}`,
    });
  }
}
