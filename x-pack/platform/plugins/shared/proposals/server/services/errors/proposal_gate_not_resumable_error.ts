/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProposalConflictError } from './proposal_conflict_error';

/**
 * Thrown when the parked gate refused to resume BEFORE the resume call was
 * made: the execution could not be read, is not waiting for input, or the
 * record carries no execution to resume. The resume was definitely not
 * accepted, so the caller may safely undo its release marker.
 */
export class ProposalGateNotResumableError extends ProposalConflictError {
  constructor(message: string) {
    super(message);
    this.name = 'ProposalGateNotResumableError';
  }
}
