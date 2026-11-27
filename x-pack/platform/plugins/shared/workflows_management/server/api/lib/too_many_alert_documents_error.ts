/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown when more alerts are requested than `loadAlertDocuments` loads in one call. */
export class TooManyAlertDocumentsError extends Error {
  constructor(public readonly limit: number, public readonly requestedCount: number) {
    super(`Cannot load more than ${limit} alerts at once (received ${requestedCount}).`);
    this.name = 'TooManyAlertDocumentsError';
  }
}
