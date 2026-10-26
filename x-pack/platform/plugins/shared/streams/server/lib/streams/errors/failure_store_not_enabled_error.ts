/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusError } from './status_error';

export class FailureStoreNotEnabledError extends StatusError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'FailureStoreNotEnabledError';
  }
}

export function isFailureStoreNotEnabledError(
  error: unknown
): error is FailureStoreNotEnabledError {
  return error instanceof FailureStoreNotEnabledError;
}
