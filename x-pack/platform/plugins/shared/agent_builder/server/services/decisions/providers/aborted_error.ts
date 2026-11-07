/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The provider ran out of time, or the caller aborted. */
export class DecisionProviderAbortedError extends Error {
  readonly kind = 'aborted';

  constructor(message: string) {
    super(message);
    this.name = 'DecisionProviderAbortedError';
  }
}

export const isDecisionProviderAbortedError = (
  error: unknown
): error is DecisionProviderAbortedError => error instanceof DecisionProviderAbortedError;
