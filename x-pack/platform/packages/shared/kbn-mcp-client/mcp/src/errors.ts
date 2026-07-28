/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when an MCP connection fails. Preserves the HTTP status code from the
 * server response (if any) so that callers can classify the failure as a user
 * error (401, 403, bad config) vs a framework error (5xx, network).
 */
export class McpConnectionError extends Error {
  readonly httpStatus?: number;

  constructor(message: string, options?: { httpStatus?: number; cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'McpConnectionError';
    this.httpStatus = options?.httpStatus;
  }
}
