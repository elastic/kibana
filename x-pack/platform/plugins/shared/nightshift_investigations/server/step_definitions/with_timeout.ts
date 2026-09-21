/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runs `work` with a signal that aborts after `ms`, so the work can stop itself rather than being
 * abandoned while it keeps running.
 */
export const withTimeout = <T>(
  work: (signal: AbortSignal) => Promise<T>,
  ms: number,
  message: string
): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  const promise = work(controller.signal);
  // Callers that ignore the signal still settle late. Swallow that rejection so it cannot surface
  // as an unhandledRejection and take Kibana down after we have already rejected below.
  void promise.catch(() => undefined);

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const onAbort = () => reject(new Error(message));
      controller.signal.addEventListener('abort', onAbort, { once: true });
    }),
  ]).finally(() => clearTimeout(timer));
};
