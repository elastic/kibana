/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown when the acting principal lacks the privilege the operation needs. */
export class ProposalForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProposalForbiddenError';
  }
}
