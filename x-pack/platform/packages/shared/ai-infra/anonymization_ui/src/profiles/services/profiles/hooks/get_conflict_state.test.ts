/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapProfilesApiError } from '../errors';
import { getConflictState } from './get_conflict_state';

describe('getConflictState', () => {
  it('returns non-conflict for unknown errors', () => {
    const state = getConflictState(new Error('plain error'));

    expect(state).toEqual({ isConflict: false, error: undefined });
  });

  it('returns conflict state for mapped conflict errors', () => {
    const conflictError = mapProfilesApiError({ statusCode: 409 });
    const state = getConflictState(conflictError);

    expect(state.isConflict).toBe(true);
    expect(state.error).toBe(conflictError);
  });
});
