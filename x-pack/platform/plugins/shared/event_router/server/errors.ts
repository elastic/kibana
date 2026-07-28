/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The producer sent something the router cannot accept (unknown event type,
 * payload that fails its schema). Retrying the same request fails the same way,
 * so this maps to a 4xx rather than a retryable 5xx.
 */
export class InvalidEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEventError';
  }
}

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
