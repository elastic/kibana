/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Raised when a proposed improvement cannot be given a stable identity — see `identity.ts`. */
export class InvalidImprovementError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'InvalidImprovementError';
  }
}
