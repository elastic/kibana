/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CeError } from './ce_error';
import { CePermissionsConflictError } from './ce_permissions_conflict_error';

describe('CePermissionsConflictError', () => {
  it('is an CeError with the given message and its own name', () => {
    const error = new CePermissionsConflictError(
      'attachmentType "lens" derives permissions via getPermissions()'
    );

    expect(error).toBeInstanceOf(CeError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('attachmentType "lens" derives permissions via getPermissions()');
    expect(error.name).toBe('CePermissionsConflictError');
  });
});
