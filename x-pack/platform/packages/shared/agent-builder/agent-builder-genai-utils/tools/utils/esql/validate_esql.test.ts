/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateEsqlQuery } from './validate_esql';
const FIRST_STEP_QUERIES = [
  'FROM ',
  'FROM index | LIMIT ',
  'FROM index | LIMIT abc',
  'FROM index | ',
  'FROM index | WHERE field == ',
  'row',
] as const;

describe('validateEsqlQuery', () => {
  it('returns undefined for a valid query', async () => {
    const error = await validateEsqlQuery('FROM index | LIMIT 10');
    expect(error).toBeUndefined();
  });

  it('returns a non-empty error for invalid syntax (incomplete FROM)', async () => {
    const error = await validateEsqlQuery('FROM ');
    expect(error).toBeDefined();
    expect(error!.length).toBeGreaterThan(0);
    expect(error).toMatch(/SyntaxError|mismatched|expecting/i);
  });

  it('returns a non-empty error for invalid LIMIT', async () => {
    const error = await validateEsqlQuery('FROM index | LIMIT ');
    expect(error).toBeDefined();
    expect(error!).toMatch(/SyntaxError|mismatched|expecting/i);
  });

  it('returns a non-empty error for invalid LIMIT (non-numeric)', async () => {
    const error = await validateEsqlQuery('FROM index | LIMIT abc');
    expect(error).toBeDefined();
    expect(error!).toMatch(/SyntaxError|mismatched|expecting|abc/i);
  });

  it('returns a non-empty error for trailing pipe', async () => {
    const error = await validateEsqlQuery('FROM index | ');
    expect(error).toBeDefined();
    expect(error!.length).toBeGreaterThan(0);
  });

  it('returns a non-empty error for invalid WHERE (incomplete expression)', async () => {
    const error = await validateEsqlQuery('FROM index | WHERE field == ');
    expect(error).toBeDefined();
    expect(error!).toMatch(/SyntaxError|mismatched|expecting/i);
  });

  it('returns explicit error messages for multiple invalid queries', async () => {
    const invalidQueries = ['FROM ', 'FROM index | LIMIT abc'];
    for (const q of invalidQueries) {
      const error = await validateEsqlQuery(q);
      expect(error).toBeDefined();
      expect(error!.length).toBeGreaterThan(5);
    }
  });

  it('FIRST_STEP_QUERIES: ANTLR returns errors for each (compare with _query)', async () => {
    for (const q of FIRST_STEP_QUERIES) {
      const error = await validateEsqlQuery(q);
      expect(error).toBeDefined();
      expect(error!.length).toBeGreaterThan(0);
    }
  });
});
