/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A callback transport's failure to deliver. Only a retryable one is sent again. */
export class CallbackDeliveryError extends Error {
  readonly retryable: boolean;

  constructor(message: string, { retryable }: { retryable: boolean }) {
    super(message);
    this.name = 'CallbackDeliveryError';
    this.retryable = retryable;
  }
}

export const isCallbackDeliveryError = (error: unknown): error is CallbackDeliveryError =>
  error instanceof CallbackDeliveryError;

/** Throws for a non-2xx response status; a 5xx is retryable, any other is not. */
export const throwIfNotDelivered = ({ status }: { status: number }): void => {
  if (status >= 200 && status < 300) {
    return;
  }

  throw new CallbackDeliveryError(`Callback delivery failed with status ${status}`, {
    retryable: status >= 500,
  });
};
