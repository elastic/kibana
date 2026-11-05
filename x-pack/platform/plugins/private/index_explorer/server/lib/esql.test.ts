/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { coerceEsqlParam, runEsql } from './esql';
import { InvalidRequestError } from './errors';

describe('coerceEsqlParam', () => {
  it('keeps strings as-is', () => {
    expect(coerceEsqlParam({ name: 'a', type: 'string', value: ' x ' })).toBe(' x ');
  });

  it('parses numbers and maps blank numbers to null', () => {
    expect(coerceEsqlParam({ name: 'a', type: 'number', value: ' 1.5 ' })).toBe(1.5);
    expect(coerceEsqlParam({ name: 'a', type: 'number', value: '' })).toBeNull();
  });

  it('rejects invalid numbers', () => {
    expect(() => coerceEsqlParam({ name: 'a', type: 'number', value: 'abc' })).toThrow(
      InvalidRequestError
    );
  });

  it('parses booleans', () => {
    expect(coerceEsqlParam({ name: 'a', type: 'boolean', value: 'TRUE' })).toBe(true);
    expect(coerceEsqlParam({ name: 'a', type: 'boolean', value: 'no' })).toBe(false);
  });
});

describe('runEsql', () => {
  it('sends named parameters and maps the response', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({
      took: 3,
      columns: [{ name: 'count', type: 'long' }],
      values: [[5]],
    });

    const result = await runEsql({
      esClient,
      body: {
        query: 'FROM logs | WHERE bytes > ?min | STATS count = COUNT(*)',
        params: [{ name: 'min', type: 'number', value: '10' }],
      },
    });

    expect(esClient.esql.query).toHaveBeenCalledWith({
      query: 'FROM logs | WHERE bytes > ?min | STATS count = COUNT(*)',
      params: [{ min: 10 }],
    });
    expect(result).toEqual({
      took: 3,
      isPartial: false,
      columns: [{ name: 'count', type: 'long' }],
      values: [[5]],
    });
  });

  it('omits params when there are none', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({ columns: [], values: [] });

    await runEsql({ esClient, body: { query: 'FROM logs', params: [] } });

    expect(esClient.esql.query).toHaveBeenCalledWith({ query: 'FROM logs' });
  });
});
