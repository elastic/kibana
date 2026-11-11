/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Raised when a stored `signal_time_range` cannot be resolved to a concrete window. */
export class InvalidSignalWindowError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'InvalidSignalWindowError';
  }
}
