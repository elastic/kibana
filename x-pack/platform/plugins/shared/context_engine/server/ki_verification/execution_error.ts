/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class KiVerifierExecutionError extends Error {
  constructor(public readonly verifierId: string, public readonly cause: unknown) {
    super(`KI verifier '${verifierId}' failed to execute`);
    this.name = 'KiVerifierExecutionError';
  }
}
