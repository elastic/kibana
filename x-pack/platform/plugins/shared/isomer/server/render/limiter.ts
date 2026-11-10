/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Thrown when every render slot is taken and the queue is full: the host is busy, retry later. */
export class RenderBusyError extends Error {
  constructor() {
    super(
      i18n.translate('xpack.isomer.render.busy', {
        defaultMessage: 'Kibana is drawing too many images right now. Try again shortly.',
      })
    );
    this.name = 'RenderBusyError';
  }
}

export interface Limiter {
  <T>(render: () => Promise<T>): Promise<T>;
  /** Renders running now. */
  readonly running: number;
  /** Renders waiting for a slot. */
  readonly queued: number;
}

/**
 * Runs at most `inFlight` renders at once and queues up to `maxQueued` more, refusing past that
 * with a {@link RenderBusyError}, so a burst waits rather than growing the heap. As Isomer's
 * takumi docs recommend for a small server.
 */
export const createLimiter = (inFlight: number, maxQueued: number): Limiter => {
  let running = 0;
  const waiting: Array<() => void> = [];
  const limit = async <T>(render: () => Promise<T>): Promise<T> => {
    if (running < inFlight) {
      running += 1;
    } else {
      if (waiting.length >= maxQueued) {
        throw new RenderBusyError();
      }
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    try {
      return await render();
    } finally {
      // Hand the slot straight to the next waiting render, so a call that lands before it
      // resumes cannot take the slot too.
      const next = waiting.shift();
      if (next) {
        next();
      } else {
        running -= 1;
      }
    }
  };
  return Object.defineProperties(limit, {
    running: { get: () => running },
    queued: { get: () => waiting.length },
  }) as Limiter;
};
