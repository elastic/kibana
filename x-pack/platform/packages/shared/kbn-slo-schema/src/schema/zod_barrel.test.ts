/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as schemaBarrel from '.';
import * as zodSchemas from './zod';

// Helpers, not io-ts twins: exported under their final name without the suffix.
const UNSUFFIXED_EXPORTS = new Set(['is']);

describe('zod schema barrel', () => {
  it('re-exports every zod twin with the temporary Zod suffix', () => {
    // The barrel renames each export by hand, so a schema added to ./zod
    // without a matching entry would silently never reach package consumers.
    const missing = Object.keys(zodSchemas).filter(
      (name) => !UNSUFFIXED_EXPORTS.has(name) && !(`${name}Zod` in schemaBarrel)
    );
    expect(missing).toEqual([]);
  });

  it('exports the is guard unsuffixed', () => {
    expect(schemaBarrel.is).toBe(zodSchemas.is);
  });
});
