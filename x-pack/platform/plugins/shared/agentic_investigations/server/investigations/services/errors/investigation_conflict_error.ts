/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when the investigation document cannot be updated: a concurrent write
 * modified it between the read and write, causing the optimistic-concurrency
 * guard to reject the update.
 */
export class InvestigationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvestigationConflictError';
  }
}
