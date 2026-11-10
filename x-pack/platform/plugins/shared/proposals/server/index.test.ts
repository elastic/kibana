/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ProposalAlreadyExistsError,
  ProposalConflictError,
  ProposalLookupTruncatedError,
  ProposalNotFoundError,
} from '.';

describe('proposals server entry point', () => {
  it('exports the errors a caller of the service has to recognise', () => {
    expect(new ProposalNotFoundError('id')).toBeInstanceOf(Error);
    expect(new ProposalAlreadyExistsError('taken')).toBeInstanceOf(ProposalAlreadyExistsError);
    expect(new ProposalLookupTruncatedError('partial')).toBeInstanceOf(Error);
  });

  it('keeps a duplicate id a conflict, so a caller that only knows about conflicts still catches it', () => {
    expect(new ProposalAlreadyExistsError('taken')).toBeInstanceOf(ProposalConflictError);
  });
});
