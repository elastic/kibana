/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as schemaBarrel from '.';
import * as zodSchemas from './zod';

// The `is` guard ships to consumers with the guard-sweep PR of the migration.
const NOT_YET_EXPORTED = new Set(['is']);

describe('zod schema barrel', () => {
  it('re-exports every zod twin with the temporary Zod suffix', () => {
    // The barrel renames each export by hand, so a schema added to ./zod
    // without a matching entry would silently never reach package consumers.
    const missing = Object.keys(zodSchemas).filter(
      (name) => !NOT_YET_EXPORTED.has(name) && !(`${name}Zod` in schemaBarrel)
    );
    expect(missing).toEqual([]);
  });
});
