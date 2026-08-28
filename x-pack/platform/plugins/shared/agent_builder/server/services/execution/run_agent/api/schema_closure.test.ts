/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadSchemaClosure } from './schema_closure';

let mockFlakyAttempts = 0;

jest.mock('@elastic/schemas/es/json/_types.json', () => ({
  $defs: {
    Duration: { type: 'string' },
    Query: { $ref: './_types.query_dsl.json#/$defs/QueryContainer' },
  },
}));

jest.mock('@elastic/schemas/es/json/_types.query_dsl.json', () => ({
  $defs: { QueryContainer: { type: 'object' } },
}));

// Throws on its first load only, to prove a failed build is not memoized.
jest.mock('@elastic/schemas/es/json/_spec_utils.json', () => {
  mockFlakyAttempts += 1;
  if (mockFlakyAttempts === 1) {
    throw new Error('transient load failure');
  }
  return { $defs: { Ok: { type: 'string' } } };
});

const durationSchema = () => ({
  properties: { timeout: { $ref: './_types.json#/$defs/Duration' } },
});

describe('loadSchemaClosure', () => {
  it('loads every file a schema reaches, transitively', async () => {
    const closure = await loadSchemaClosure('elasticsearch', durationSchema());

    expect(Array.from(closure.keys())).toEqual(['./_types.json', './_types.query_dsl.json']);
  });

  it('returns the memoized closure for a repeated schema instead of rebuilding it', async () => {
    const schema = durationSchema();

    const first = await loadSchemaClosure('elasticsearch', schema);
    const second = await loadSchemaClosure('elasticsearch', schema);

    expect(second).toBe(first);
  });

  it('shares one in-flight build between concurrent callers', async () => {
    const schema = durationSchema();

    const [first, second] = await Promise.all([
      loadSchemaClosure('elasticsearch', schema),
      loadSchemaClosure('elasticsearch', schema),
    ]);

    expect(second).toBe(first);
  });

  it('memoizes per schema instance, so another API builds its own closure', async () => {
    const first = await loadSchemaClosure('elasticsearch', durationSchema());
    const second = await loadSchemaClosure('elasticsearch', durationSchema());

    expect(second).not.toBe(first);
    expect(Array.from(second.keys())).toEqual(Array.from(first.keys()));
  });

  it('rejects a reference that escapes the schemas package', async () => {
    const schema = { properties: { timeout: { $ref: '../outside.json#/$defs/Duration' } } };

    await expect(loadSchemaClosure('elasticsearch', schema)).rejects.toThrow(
      'Unsupported schema reference'
    );
  });

  it('does not memoize a rejection, so the next call retries', async () => {
    const schema = { properties: { ok: { $ref: './_spec_utils.json#/$defs/Ok' } } };

    await expect(loadSchemaClosure('elasticsearch', schema)).rejects.toThrow(
      'transient load failure'
    );

    const closure = await loadSchemaClosure('elasticsearch', schema);

    expect(Array.from(closure.keys())).toEqual(['./_spec_utils.json']);
  });
});
