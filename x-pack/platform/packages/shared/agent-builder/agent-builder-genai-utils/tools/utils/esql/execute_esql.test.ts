/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  it('sends params alongside the frozen tier exclusion', async () => {
    await executeEsql({
      query: 'FROM idx | WHERE host == ?host',
      params: [{ host: 'server-1' }],
      esClient,
    });

    expect(lastRequest()).toEqual(
      expect.objectContaining({
        params: [{ host: 'server-1' }],
        filter: frozenExclusion,
      })
    );
  });
});
