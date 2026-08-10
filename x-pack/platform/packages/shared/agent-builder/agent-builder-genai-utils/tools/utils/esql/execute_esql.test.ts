/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { executeEsql } from './execute_esql';

describe('executeEsql', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  const getRequest = () => esClient.esql.query.mock.calls[0][0];

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue({
      columns: [{ name: 'title', type: 'keyword' }],
      values: [['a title']],
    } as never);
  });

  it('returns the columns and values from the response', async () => {
    const result = await executeEsql({ query: 'FROM idx', esClient });

    expect(result).toEqual({
      columns: [{ name: 'title', type: 'keyword' }],
      values: [['a title']],
    });
  });

  it('passes the filter through to the ES|QL request', async () => {
    const filter: QueryDslQueryContainer = { terms: { spaces: ['marketing', '*'] } };

    await executeEsql({ query: 'FROM idx', filter, esClient });

    expect(getRequest()).toEqual(expect.objectContaining({ filter }));
  });

  it('omits the filter key entirely when no filter is provided', async () => {
    await executeEsql({ query: 'FROM idx', esClient });

    expect(getRequest()).not.toHaveProperty('filter');
  });

  it('sends both params and filter when both are provided', async () => {
    const filter: QueryDslQueryContainer = { term: { spaces: 'marketing' } };

    await executeEsql({
      query: 'FROM idx | WHERE title == ?title',
      params: [{ title: 'a title' }],
      filter,
      esClient,
    });

    expect(getRequest()).toEqual(
      expect.objectContaining({ params: [{ title: 'a title' }], filter })
    );
  });

  it('omits the params key entirely when the params array is empty', async () => {
    await executeEsql({ query: 'FROM idx', params: [], esClient });

    expect(getRequest()).not.toHaveProperty('params');
  });

  it('applies the limit to the query when one is provided', async () => {
    await executeEsql({ query: 'FROM idx', limit: 10, esClient });

    expect(getRequest().query).toBe('FROM idx | LIMIT 10');
  });

  it('leaves the query untouched when no limit is provided', async () => {
    await executeEsql({ query: 'FROM idx', esClient });

    expect(getRequest().query).toBe('FROM idx');
  });

  it('rethrows a maximum-response-size error with actionable guidance', async () => {
    esClient.esql.query.mockRejectedValue(
      new errors.RequestAbortedError('Response content length exceeded')
    );

    await expect(executeEsql({ query: 'FROM idx', esClient })).rejects.toThrow(
      /exceeded the maximum allowed size of 20MB/
    );
  });

  it('rethrows any other error unchanged', async () => {
    const original = new Error('verification_exception');
    esClient.esql.query.mockRejectedValue(original);

    await expect(executeEsql({ query: 'FROM idx', esClient })).rejects.toBe(original);
  });
});
