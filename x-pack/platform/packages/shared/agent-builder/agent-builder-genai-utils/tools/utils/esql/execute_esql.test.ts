/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { MAX_ES_RESPONSE_SIZE_BYTES } from '../../constants';
import { executeEsql } from './execute_esql';

describe('executeEsql', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  const esqlResponse = {
    columns: [{ name: 'foo', type: 'keyword' as const }],
    values: [['bar']],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.esql.query.mockResolvedValue(esqlResponse);
  });

  const lastRequest = () => esClient.esql.query.mock.calls[0][0];

  it('passes the query through with the standard request options', async () => {
    const result = await executeEsql({ query: 'FROM idx', esClient });

    expect(lastRequest()).toEqual({
      query: 'FROM idx',
      drop_null_columns: true,
      allow_partial_results: true,
    });
    expect(esClient.esql.query.mock.calls[0][1]).toEqual({
      maxResponseSize: MAX_ES_RESPONSE_SIZE_BYTES,
    });
    expect(result).toEqual(esqlResponse);
  });

  it('forwards dropNullColumns: false as drop_null_columns: false', async () => {
    await executeEsql({ query: 'FROM idx', dropNullColumns: false, esClient });

    expect(lastRequest()).toEqual({
      query: 'FROM idx',
      drop_null_columns: false,
      allow_partial_results: true,
    });
  });

  it('forwards the filter to Elasticsearch when one is provided', async () => {
    const filter = { term: { status: 'open' } };

    await executeEsql({ query: 'FROM idx', filter, esClient });

    expect(lastRequest()).toEqual(expect.objectContaining({ filter }));
  });

  it('omits the filter key entirely when none is provided', async () => {
    await executeEsql({ query: 'FROM idx', esClient });

    expect(lastRequest()).not.toHaveProperty('filter');
  });

  it('omits the filter key when it is explicitly undefined', async () => {
    await executeEsql({ query: 'FROM idx', filter: undefined, esClient });

    expect(lastRequest()).not.toHaveProperty('filter');
  });

  it('sends params and filter together without either overwriting the other', async () => {
    const filter = { range: { '@timestamp': { gte: 'now-1h' } } };

    await executeEsql({
      query: 'FROM idx | WHERE host == ?host',
      params: [{ host: 'server-1' }],
      filter,
      esClient,
    });

    expect(lastRequest()).toEqual(
      expect.objectContaining({
        query: 'FROM idx | WHERE host == ?host',
        params: [{ host: 'server-1' }],
        filter,
      })
    );
  });

  it('applies the limit to the query while leaving the filter untouched', async () => {
    const filter = { term: { status: 'open' } };

    await executeEsql({ query: 'FROM idx', limit: 10, filter, esClient });

    expect(lastRequest()).toEqual(
      expect.objectContaining({ query: 'FROM idx | LIMIT 10', filter })
    );
  });

  it('translates a maximum-response-size abort into an actionable error', async () => {
    esClient.esql.query.mockRejectedValue(
      new errors.RequestAbortedError(
        'The content length (9000) is bigger than the maximum allowed buffer (42)'
      )
    );

    await expect(executeEsql({ query: 'FROM idx', esClient })).rejects.toThrow(
      /exceeded the maximum allowed size of 20MB/
    );
  });

  it('rethrows any other Elasticsearch error unchanged', async () => {
    const error = new Error('verification_exception: unknown column [missing]');
    esClient.esql.query.mockRejectedValue(error);

    await expect(
      executeEsql({ query: 'FROM idx', filter: { term: { status: 'open' } }, esClient })
    ).rejects.toThrow(error);
  });
});
