/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProposalConflictError } from './proposal_conflict_error';

/**
 * Thrown when `create()` is given an `id` that already exists.
 *
 * A subclass of {@link ProposalConflictError} so it is already a 409 on the
 * routes and a `ConflictError` in a workflow, while a caller that wants to tell
 * it apart from "someone decided first" still can. The service reads nothing on
 * the way to this error, so it says nothing about the existing proposal, whoever
 * or whichever space owns it.
 */
export class ProposalAlreadyExistsError extends ProposalConflictError {
  constructor(message: string) {
    super(message);
    this.name = 'ProposalAlreadyExistsError';
  }
}
