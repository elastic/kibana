/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The gate a caller asked for does not match the rest of the proposal: a gated
 * one without the execution that owns it, or a gateless one carrying something
 * only a gate can settle — an action, a deadline, or a gate execution.
 *
 * Raised at creation, because the combination is a programming error rather
 * than a state the record can recover from.
 */
export class ProposalInvalidGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProposalInvalidGateError';
  }
}
