/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown when the decision deadline has passed. */
export class ProposalExpiredError extends Error {
  constructor(id: string) {
    super(`Proposal [${id}] expired and can no longer be decided`);
    this.name = 'ProposalExpiredError';
  }
}
