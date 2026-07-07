/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SmlError } from './sml_error';
import { SmlPermissionsConflictError } from './sml_permissions_conflict_error';

describe('SmlPermissionsConflictError', () => {
  it('is an SmlError with the given message and its own name', () => {
    const error = new SmlPermissionsConflictError(
      'attachmentType "lens" derives permissions via getPermissions()'
    );

    expect(error).toBeInstanceOf(SmlError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('attachmentType "lens" derives permissions via getPermissions()');
    expect(error.name).toBe('SmlPermissionsConflictError');
  });
});
