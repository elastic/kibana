/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The provider cannot answer for now, e.g. it is not configured or the cluster has no model. */
export class DecisionProviderUnavailableError extends Error {
  readonly kind = 'unavailable';

  constructor(message: string) {
    super(message);
    this.name = 'DecisionProviderUnavailableError';
  }
}

export const isDecisionProviderUnavailableError = (
  error: unknown
): error is DecisionProviderUnavailableError => error instanceof DecisionProviderUnavailableError;
