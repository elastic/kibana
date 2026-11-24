/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProposalConflictError } from './proposal_conflict_error';
import { ProposalWriteConflictError } from './proposal_write_conflict_error';

describe('ProposalWriteConflictError', () => {
  it('reads as a conflict to callers that match by name', () => {
    const error = new ProposalWriteConflictError('lost');

    expect(error).toBeInstanceOf(ProposalConflictError);
    expect(error.name).toBe('ProposalConflictError');
  });
});
