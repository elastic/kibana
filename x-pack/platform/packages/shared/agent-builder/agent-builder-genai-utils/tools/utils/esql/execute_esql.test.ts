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

  const frozenExclusion = { bool: { must_not: [{ term: { _tier: 'data_frozen' } }] } };

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
      filter: frozenExclusion,
    });
    expect(esClient.esql.query.mock.calls[0][1]).toEqual({
      maxResponseSize: MAX_ES_RESPONSE_SIZE_BYTES,
    });
    expect(result).toEqual(esqlResponse);
  });

  it('excludes frozen tier indices by default', async () => {
    await executeEsql({ query: 'FROM idx', esClient });

    expect(lastRequest()).toEqual(expect.objectContaining({ filter: frozenExclusion }));
  });

  it('omits the filter key entirely when frozen tier indices are included', async () => {
    await executeEsql({ query: 'FROM idx', includeFrozen: true, esClient });

    expect(lastRequest()).not.toHaveProperty('filter');
  });

  it('sends params and the frozen tier exclusion together without either overwriting the other', async () => {
    await executeEsql({
      query: 'FROM idx | WHERE host == ?host',
      params: [{ host: 'server-1' }],
      esClient,
    });

    expect(lastRequest()).toEqual(
      expect.objectContaining({
        query: 'FROM idx | WHERE host == ?host',
        params: [{ host: 'server-1' }],
        filter: frozenExclusion,
      })
    );
  });

  it('applies the limit to the query while leaving the frozen tier exclusion untouched', async () => {
    await executeEsql({ query: 'FROM idx', limit: 10, esClient });

    expect(lastRequest()).toEqual(
      expect.objectContaining({ query: 'FROM idx | LIMIT 10', filter: frozenExclusion })
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

    await expect(executeEsql({ query: 'FROM idx', esClient })).rejects.toThrow(error);
  });
});
