/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A callback transport's failure to deliver. Only a retryable one is sent again, after
 * `retryAfterMs` when the receiver asked for a delay.
 */
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

/**
 * The delay in milliseconds a `Retry-After` header asks for, as delta-seconds or an HTTP-date
 * (RFC 9110); `undefined` when the value is missing or unparseable.
 */
export const parseRetryAfter = (
  value: string | null | undefined,
  now: number = Date.now()
): number | undefined => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }

  // HTTP-dates always name the day or month; this keeps Date.parse from reading bare numbers.
  const date = /[a-z]/i.test(trimmed) ? Date.parse(trimmed) : NaN;

  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
};

/**
 * Throws for a non-2xx response status; a 5xx or 429 is retryable, any other is not. A retryable
 * error carries the delay its `Retry-After` header asks for.
 */
export const throwIfNotDelivered = ({
  status,
  retryAfter,
}: {
  status: number;
  retryAfter?: string | null;
}): void => {
  if (status >= 200 && status < 300) {
    return;
  }

  const retryable = status >= 500 || status === 429;

  throw new CallbackDeliveryError(`Callback delivery failed with status ${status}`, {
    retryable,
    retryAfterMs: retryable ? parseRetryAfter(retryAfter) : undefined,
  });
};
