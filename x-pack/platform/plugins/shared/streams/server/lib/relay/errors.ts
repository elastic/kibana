/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file */

export class StatusError extends Error {
  public data?: unknown;
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

export class RelayServiceError extends StatusError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, 502);
    this.name = 'RelayServiceError';
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Thrown when the underlying `fetch` call itself fails (e.g. ECONNREFUSED,
 * DNS failure, timeout) — the relay-service was never reached.
 */
export class RelayUnreachableError extends RelayServiceError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, options);
    this.name = 'RelayUnreachableError';
  }
}

/**
 * Thrown when the relay-service responds with a non-2xx HTTP status. The
 * upstream status code is stored in `data.upstreamStatus` so it flows
 * through to the Boom `attributes.data` payload on the response.
 */
export class RelayResponseError extends RelayServiceError {
  constructor(message: string, upstreamStatus: number) {
    super(message);
    this.name = 'RelayResponseError';
    this.data = { upstreamStatus };
  }
}

export const isRelayServiceError = (error: unknown): error is RelayServiceError =>
  error instanceof RelayServiceError;
