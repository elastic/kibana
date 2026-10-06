/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when a cluster-state mutation resolves with `{ acknowledged: false }`, which
 * Elasticsearch returns on a cluster-manager timeout. Treated as transient by
 * `EsTransientRetryService`.
 */
export class EsUnacknowledgedError extends Error {
  constructor(operation: string) {
    super(`Elasticsearch did not acknowledge: ${operation}`);
    this.name = 'EsUnacknowledgedError';
  }
}
