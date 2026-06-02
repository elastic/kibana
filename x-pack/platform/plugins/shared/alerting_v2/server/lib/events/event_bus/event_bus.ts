/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitterAsyncResource } from 'node:events';
import { inject, injectable } from 'inversify';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type { DomainEvent, EventBus, Subscription } from './types';

const ASYNC_RESOURCE_NAME = 'AlertingDomainEventBus';

type AnyHandler = (event: DomainEvent) => Promise<void> | void;

type EventBusErrorCode = 'EVENT_BUS_HANDLER_FAILURE' | 'EVENT_BUS_EMITTER_ERROR';

interface EventBusErrorContext {
  /** Stable machine-readable identifier used for log correlation. */
  readonly code: EventBusErrorCode;
  /**
   * Human-readable scope appended to `EventBus:` in the log `type` field.
   * Use the domain event's `type` for handler failures, or `'internal'`
   * for failures originating in the underlying emitter.
   */
  readonly scope: string;
}

/**
 * Event names that have special semantics on Node's {@link EventEmitter} and
 * therefore cannot be used as domain-event `type` discriminators:
 *
 *  - `error`              — emitting without a listener crashes the process.
 *  - `newListener` /
 *    `removeListener`     — emitter lifecycle events fired automatically.
 *                           Allowing them as domain types would invoke internal bookkeeping handlers.
 *
 * See https://nodejs.org/api/events.html#error-events.
 */
const RESERVED_EVENT_TYPES: ReadonlySet<string> = new Set([
  'error',
  'newListener',
  'removeListener',
]);

/**
 * Default {@link EventBus} implementation.
 *
 * Behaviour:
 *  - `publish` validates the event has a non-reserved string `type` field and
 *    dispatches each listener on the next event-loop iteration via
 *    `setImmediate`. The publisher's call stack returns synchronously and
 *    is never blocked by handler work. Yielding between events lets I/O
 *    drain instead of being starved by a long microtask queue.
 *  - Each handler is invoked inside its own try/catch. A thrown handler
 *    (sync throw or rejected promise) is logged but never bubbles up nor
 *    prevents the other handlers from running.
 *  - Backed by Node's {@link EventEmitterAsyncResource} with
 *    `captureRejections` enabled as a defense-in-depth measure, plus a
 *    permanent `'error'` listener so the bus can never crash the process.
 *    `EventEmitterAsyncResource` labels the bus as a discrete async
 *    resource so async-hooks / APM tooling can attribute handler work
 *    back to the bus. See
 *    https://nodejs.org/api/events.html#class-eventseventemitterasyncresource-extends-eventemitter
 *    and https://nodejs.org/api/events.html#error-events.
 *  - The bus owns no per-event state. Replays/persistence are out of scope.
 *  - The default `EventEmitter` listener-limit warning (10 per event) is
 *    kept intentionally. It is a useful memory-leak signal.
 */
@injectable()
export class AlertingDomainEventBus<TEvent extends DomainEvent = DomainEvent>
  implements EventBus<TEvent>
{
  readonly #emitter = new EventEmitterAsyncResource({
    captureRejections: true,
    name: ASYNC_RESOURCE_NAME,
  });

  constructor(@inject(LoggerServiceToken) private readonly logger: LoggerServiceContract) {
    // Per Node's docs, emitting `'error'` with no listener crashes the
    // process. We register a permanent defensive listener so the bus is
    // safe regardless of what is published or what `captureRejections`
    // routes here.
    this.#emitter.on('error', (err) =>
      this.#logError(err, { code: 'EVENT_BUS_EMITTER_ERROR', scope: 'internal' })
    );
  }

  public publish<E extends TEvent>(event: E): void {
    if (!event || typeof event.type !== 'string') {
      this.logger.debug({
        message: () =>
          `[alerting_v2.EventBus] Refused to publish event without a string \`type\` discriminator.`,
      });

      return;
    }

    if (RESERVED_EVENT_TYPES.has(event.type)) {
      this.logger.warn({
        message: () =>
          `[alerting_v2.EventBus] Refused to publish event with reserved \`type\` "${event.type}". ` +
          `These names are reserved by Node's EventEmitter.`,
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
      setImmediate(async () => {
        try {
          await handler(event as E);
        } catch (err) {
          this.#logError(err, { code: 'EVENT_BUS_HANDLER_FAILURE', scope: event.type });
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

  #logError(err: unknown, { code, scope }: EventBusErrorContext): void {
    const error = err instanceof Error ? err : new Error(String(err));
    this.logger.error({
      error,
      code,
      type: `EventBus:${scope}`,
    });
  }
}
