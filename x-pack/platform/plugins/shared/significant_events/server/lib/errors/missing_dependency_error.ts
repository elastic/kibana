/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusError } from './status_error';

/**
 * Thrown when significant events cannot run because a required runtime
 * dependency (e.g. a plugin) is not available. Surfaces as a 409 Conflict.
 */
export class MissingDependencyError extends StatusError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'MissingDependencyError';
  }
}

export function isMissingDependencyError(error: unknown): error is MissingDependencyError {
  return error instanceof MissingDependencyError;
}
