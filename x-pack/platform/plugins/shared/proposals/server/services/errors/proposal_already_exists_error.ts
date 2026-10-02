/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProposalConflictError } from './proposal_conflict_error';

/**
 * Thrown when `create()` is given an `id` that is already taken by a proposal the
 * caller cannot reuse: its chain has settled, or it belongs to another space.
 *
 * A subclass of {@link ProposalConflictError} so it is already a 409 on the
 * routes and a `ConflictError` in a workflow, while a caller that wants to tell
 * it apart from "someone decided first" still can. Deliberately says nothing
 * about *why* the id is unusable beyond what the caller supplied: for a record in
 * another space, anything more would disclose it.
 */
export class ProposalAlreadyExistsError extends ProposalConflictError {
  constructor(message: string) {
    super(message);
    this.name = 'ProposalAlreadyExistsError';
  }
}
