/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { pathToSpecId } = require('./spec_id');

describe('pathToSpecId', () => {
  it('takes the file name minus the .spec.ts suffix', () => {
    expect(pathToSpecId('evals/discovery/discovery.spec.ts')).toBe('discovery');
    expect(pathToSpecId('evals/ki_query_generation/ki_query_generation.spec.ts')).toBe(
      'ki_query_generation'
    );
  });

  it('ignores the directory, so only the file name decides the id', () => {
    expect(pathToSpecId('a/b/c/thing.spec.ts')).toBe('thing');
    expect(pathToSpecId('thing.spec.ts')).toBe('thing');
  });
});
