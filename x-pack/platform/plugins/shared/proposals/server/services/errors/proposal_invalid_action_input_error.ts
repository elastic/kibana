/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The caller's `actionInput` does not satisfy the action workflow's declared
 * input schema. Raised at creation so the Worker gets a precise error, rather
 * than the proposal reaching an analyst and failing after approval.
 */
export class ProposalInvalidActionInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProposalInvalidActionInputError';
  }
}
