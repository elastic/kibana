/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when an Elasticsearch resource changed underneath an in-flight operation, e.g. another
 * Kibana node deleted a data stream between our read and our write. Treated as transient by
 * `EsTransientRetryService`: the retry observes the new state and proceeds from there.
 */
export class EsConcurrentModificationError extends Error {
  constructor(detail: string, options?: { cause?: unknown }) {
    super(`Elasticsearch resource changed concurrently: ${detail}`, options);
    this.name = 'EsConcurrentModificationError';
  }
}
