/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown instead of a partial answer when a lookup cannot return every match in one search. */
export class ProposalLookupTruncatedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProposalLookupTruncatedError';
  }
}
