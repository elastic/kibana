/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A callback transport's failure to deliver. Only a retryable one is sent again. */
export class CallbackDeliveryError extends Error {
  readonly retryable: boolean;
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    { retryable, retryAfterMs }: { retryable: boolean; retryAfterMs?: number }
  ) {
    super(message);
    this.name = 'CallbackDeliveryError';
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

export const isCallbackDeliveryError = (error: unknown): error is CallbackDeliveryError =>
  error instanceof CallbackDeliveryError;

/** The delay in milliseconds a `Retry-After` header asks for, in delta-seconds or an HTTP-date. */
export const parseRetryAfterMs = (
  value: string | null | undefined,
  now: number = Date.now()
): number | undefined => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const seconds = Number(trimmed);

  if (!Number.isNaN(seconds)) {
    return Number.isInteger(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
  }

  const date = Date.parse(trimmed);

  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
};

/** Throws for a non-2xx response status; a 5xx or 429 is retryable, any other is not. */
export const throwIfNotDelivered = ({
  status,
  retryAfterMs,
}: {
  status: number;
  retryAfterMs?: number;
}): void => {
  if (status >= 200 && status < 300) {
    return;
  }

  const retryable = status >= 500 || status === 429;

  throw new CallbackDeliveryError(`Callback delivery failed with status ${status}`, {
    retryable,
    retryAfterMs: retryable ? retryAfterMs : undefined,
  });
};
