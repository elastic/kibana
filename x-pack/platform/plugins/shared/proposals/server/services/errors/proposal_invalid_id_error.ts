/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A caller-chosen proposal id the routes could not address: one the proposal
 * would be created under but never be read, decided or revised through.
 */
export class ProposalInvalidIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProposalInvalidIdError';
  }
}
