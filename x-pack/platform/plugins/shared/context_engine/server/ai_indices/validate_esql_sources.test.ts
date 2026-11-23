/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { InvalidEsqlSourceError } from './errors';
import { validateEsqlSources } from './validate_esql_sources';

const dest: AiIndexDest = { type: 'index', value: 'ai-index-idx-foo' };

describe('validateEsqlSources', () => {
  it('ignores connector sources', async () => {
    await expect(
      validateEsqlSources([{ type: 'connector', value: 'gd-1' }], dest)
    ).resolves.toBeUndefined();
  });

  it('accepts valid ES|QL sources', async () => {
    await expect(
      validateEsqlSources(
        [
          { type: 'esql', value: 'FROM logs-app' },
          { type: 'esql', value: 'FROM logs-web | WHERE status >= 500 | LIMIT 10' },
        ],
        dest
      )
    ).resolves.toBeUndefined();
  });

  it.each(['', '   '])('rejects an empty source %j', async (value) => {
    await expect(validateEsqlSources([{ type: 'esql', value }], dest)).rejects.toThrow(
      new InvalidEsqlSourceError('ES|QL source value cannot be empty')
    );
  });

  it('rejects a syntactically invalid source', async () => {
    await expect(
      validateEsqlSources([{ type: 'esql', value: 'FROM logs-app | WHERE' }], dest)
    ).rejects.toThrow(/^ES\|QL source 'FROM logs-app \| WHERE' is invalid: /);
  });

  it('reports every invalid source in order', async () => {
    await expect(
      validateEsqlSources(
        [
          { type: 'esql', value: 'FROM logs-web | WHERE' },
          { type: 'esql', value: 'FROM logs-app' },
          { type: 'esql', value: '' },
        ],
        dest
      )
    ).rejects.toThrow(
      /^ES\|QL source 'FROM logs-web \| WHERE' is invalid: .*\nES\|QL source value cannot be empty$/
    );
  });

  it('truncates long queries in the error message', async () => {
    const value = `FROM ${'a'.repeat(300)} | WHERE`;

    await expect(validateEsqlSources([{ type: 'esql', value }], dest)).rejects.toThrow(
      `ES|QL source '${value.slice(0, 200)}…' is invalid`
    );
  });

  it.each([
    'FROM ai-index-idx-foo',
    'FROM logs-app, ai-index-idx-foo',
    'FROM ai-index-idx-*',
    'FROM *-index-*-f*',
    'FROM ai-index-idx-foo::data',
    'FROM "logs-app, ai-index-idx-foo"',
    'FROM ai-index-idx-*, -ai-index-idx-foo',
    'TS ai-index-idx-foo',
    'LET a = (FROM ai-index-idx-foo); FROM a',
    'FROM logs-app | WHERE id IN (FROM ai-index-idx-foo | KEEP id)',
  ])('rejects a circular source %j', async (value) => {
    await expect(validateEsqlSources([{ type: 'esql', value }], dest)).rejects.toThrow(
      new InvalidEsqlSourceError(
        `ES|QL source '${value}' reads from the AI index's own dest 'ai-index-idx-foo'`
      )
    );
  });

  it.each([
    'FROM ai-index-idx-bar',
    'FROM ai-index-idx.foo',
    'FROM *-index-*-b*',
    'FROM remote:ai-index-idx-foo',
  ])('accepts a non-circular source %j', async (value) => {
    await expect(validateEsqlSources([{ type: 'esql', value }], dest)).resolves.toBeUndefined();
  });
});
