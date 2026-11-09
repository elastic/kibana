/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProposalAlreadyExistsError, ProposalConflictError } from '../services/errors';
import { toStepError } from './to_step_error';

describe('toStepError', () => {
  it('should type a conflict so a workflow can branch on it', () => {
    expect(toStepError(new ProposalConflictError('already decided'), 'fallback').type).toBe(
      'ConflictError'
    );
  });

  it('should type an id that cannot be reused as a conflict too, keeping its message', () => {
    const error = toStepError(new ProposalAlreadyExistsError('id is taken'), 'fallback');

    expect(error.type).toBe('ConflictError');
    expect(error.message).toBe('id is taken');
  });
});
