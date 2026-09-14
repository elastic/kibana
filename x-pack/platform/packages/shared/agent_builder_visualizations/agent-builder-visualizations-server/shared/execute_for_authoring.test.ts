/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeEsql } from '@kbn/agent-builder-genai-utils';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { tryExecuteForAuthoring } from './execute_for_authoring';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  executeEsql: jest.fn(),
}));

const mockedExecuteEsql = jest.mocked(executeEsql);
const esClient = {} as ElasticsearchClient;
const columns = [
  { name: 'count', type: 'long' },
  { name: 'status', type: 'keyword' },
];

describe('tryExecuteForAuthoring', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns executed columns when the query runs', async () => {
    mockedExecuteEsql.mockResolvedValue({ columns, values: [] });

    await expect(tryExecuteForAuthoring({ query: 'FROM logs-*', esClient })).resolves.toEqual({
      ok: true,
      columns,
    });
  });

  it('returns the error when execute throws so the caller can regenerate', async () => {
    mockedExecuteEsql.mockRejectedValue(new Error('unknown column foo'));

    await expect(
      tryExecuteForAuthoring({ query: 'FROM logs-* | STATS COUNT(*) BY foo', esClient })
    ).resolves.toEqual({ ok: false, error: 'unknown column foo' });
  });
});
