/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ContextEngineError } from './error';
import { ContextEnginePermissionsConflictError } from './permissions_conflict_error';

describe('ContextEnginePermissionsConflictError', () => {
  it('is an ContextEngineError with the given message and its own name', () => {
    const error = new ContextEnginePermissionsConflictError(
      'attachmentType "lens" derives permissions via getPermissions()'
    );

    expect(error).toBeInstanceOf(ContextEngineError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('attachmentType "lens" derives permissions via getPermissions()');
    expect(error.name).toBe('ContextEnginePermissionsConflictError');
  });
});
