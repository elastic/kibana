/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvalidEsqlSourceError } from './errors';
import { validateEsqlSources } from './validate_esql_sources';

describe('validateEsqlSources', () => {
  it('ignores connector sources', async () => {
    await expect(
      validateEsqlSources([{ type: 'connector', value: 'gd-1' }])
    ).resolves.toBeUndefined();
  });

  it('accepts valid ES|QL sources', async () => {
    await expect(
      validateEsqlSources([
        { type: 'esql', value: 'FROM logs-app' },
        { type: 'esql', value: 'FROM logs-web | WHERE status >= 500 | LIMIT 10' },
      ])
    ).resolves.toBeUndefined();
  });

  it.each(['', '   '])('rejects an empty source %j', async (value) => {
    await expect(validateEsqlSources([{ type: 'esql', value }])).rejects.toThrow(
      new InvalidEsqlSourceError('ES|QL source value cannot be empty')
    );
  });

  it('rejects a syntactically invalid source', async () => {
    await expect(
      validateEsqlSources([{ type: 'esql', value: 'FROM logs-app | WHERE' }])
    ).rejects.toThrow(/^ES\|QL source 'FROM logs-app \| WHERE' is invalid: /);
  });

  it('reports every invalid source in order', async () => {
    await expect(
      validateEsqlSources([
        { type: 'esql', value: 'FROM logs-web | WHERE' },
        { type: 'esql', value: 'FROM logs-app' },
        { type: 'esql', value: '' },
      ])
    ).rejects.toThrow(
      /^ES\|QL source 'FROM logs-web \| WHERE' is invalid: .*\nES\|QL source value cannot be empty$/
    );
  });

  it('truncates long queries in the error message', async () => {
    const value = `FROM ${'a'.repeat(300)} | WHERE`;

    await expect(validateEsqlSources([{ type: 'esql', value }])).rejects.toThrow(
      `ES|QL source '${value.slice(0, 200)}…' is invalid`
    );
  });
});
