/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ServiceAccountTokenExchangeErrorOptions {
  /** Whether the exchange may succeed if tried again. */
  retryable: boolean;
  /** How long to wait before trying again, when upstream said so. */
  retryAfterMs?: number;
  /**
   * The upstream HTTP status, when there was one. Unlike the cause, it is safe to log, and it is
   * what tells an account that is gone apart from one that was refused.
   */
  statusCode?: number;
}

/** Describes whether a failed service account token exchange can be retried. */
export class ServiceAccountTokenExchangeError extends Error {
  public readonly retryable: boolean;
  public readonly retryAfterMs: number;
  public readonly statusCode?: number;

  constructor(
    cause: Error,
    { retryable, retryAfterMs = 0, statusCode }: ServiceAccountTokenExchangeErrorOptions
  ) {
    super(
      statusCode === undefined
        ? 'Error occurred during service account token exchange.'
        : `Error occurred during service account token exchange (status ${statusCode}).`,
      { cause }
    );
    this.name = 'ServiceAccountTokenExchangeError';
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
    this.statusCode = statusCode;
  }
}
