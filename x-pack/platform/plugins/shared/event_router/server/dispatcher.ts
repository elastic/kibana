/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { errorMessage } from './errors';
import type { ListenerRegistry } from './listener_registry';
import type { ListenerFailure, RouterEvent } from './types';

export interface DispatchOutcome {
  enqueued: string[];
  failures: ListenerFailure[];
}

type ListenerOutcome =
  | { listenerId: string; ok: true }
  | { listenerId: string; ok: false; message: string };

const withTimeout = async (
  work: Promise<void>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    // `Promise.race` keeps a handler attached to `work`, so a late rejection
    // after the timeout wins is still observed rather than going unhandled.
    await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

interface DispatcherDeps {
  listeners: ListenerRegistry;
  logger: Logger;
  listenerTimeoutMs: number;
}

/**
 * Fans one event out to every listener whose filter matches. Listeners are
 * isolated from each other: one failing or hanging listener must not stop the
 * others from being given the event.
 */
export class Dispatcher {
  private readonly listeners: ListenerRegistry;
  private readonly logger: Logger;
  private readonly listenerTimeoutMs: number;

  constructor({ listeners, logger, listenerTimeoutMs }: DispatcherDeps) {
    this.listeners = listeners;
    this.logger = logger;
    this.listenerTimeoutMs = listenerTimeoutMs;
  }

  public async dispatch(event: RouterEvent, request: KibanaRequest): Promise<DispatchOutcome> {
    const matched = this.listeners.match(event);

    if (matched.length === 0) {
      return { enqueued: [], failures: [] };
    }

    const outcomes = await Promise.all(
      matched.map(async (listener): Promise<ListenerOutcome> => {
        try {
          await withTimeout(
            listener.handler(event, { request }),
            this.listenerTimeoutMs,
            `Listener "${listener.id}" did not enqueue its work within ${this.listenerTimeoutMs}ms`
          );
          return { listenerId: listener.id, ok: true };
        } catch (error) {
          const message = errorMessage(error);
          this.logger.error(
            `Listener "${listener.id}" failed to enqueue work for event ${event.id} of type "${event.type}": ${message}`
          );
          return { listenerId: listener.id, ok: false, message };
        }
      })
    );

    const enqueued: string[] = [];
    const failures: ListenerFailure[] = [];

    for (const outcome of outcomes) {
      if (outcome.ok) {
        enqueued.push(outcome.listenerId);
      } else {
        failures.push({ listenerId: outcome.listenerId, message: outcome.message });
      }
    }

    return { enqueued, failures };
  }
}
