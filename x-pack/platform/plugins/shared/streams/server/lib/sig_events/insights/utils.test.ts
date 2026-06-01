/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { TransportResult } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Query } from '../../../../common/queries';
import { collectQueryData } from './utils';

const makeEsError = (status: number, type: string, reason: string) =>
  new errors.ResponseError({
    statusCode: status,
    headers: {},
    warnings: [],
    meta: {} as TransportResult['meta'],
    body: { error: { type, reason } },
  } as TransportResult);

const makeQuery = (overrides: Partial<Query> = {}): Query =>
  ({
    'asset.uuid': 'uuid-q1',
    'asset.type': 'query',
    'asset.id': 'q1',
    query: {
      id: 'q1',
      type: 'match',
      title: 'Test query',
      description: 'desc',
      esql: { query: 'FROM logs | WHERE body.text:"error"' },
      severity_score: 60,
    },
    stream_name: 'logs.test',
    rule_backed: true,
    rule_id: 'rule-q1',
    ...overrides,
  } as Query);

interface Mocks {
  esClient: jest.Mocked<ElasticsearchClient>;
  esqlQuery: jest.Mock;
}

const createMocks = (): Mocks => {
  const esqlQuery = jest.fn();
  const esClient = {
    esql: { query: esqlQuery },
  } as unknown as jest.Mocked<ElasticsearchClient>;
  return { esClient, esqlQuery };
};

describe('collectQueryData verification_exception handling', () => {
  it('returns undefined when the alerts index is missing (Unknown index)', async () => {
    const { esClient, esqlQuery } = createMocks();
    esqlQuery.mockRejectedValue(
      makeEsError(400, 'verification_exception', 'Unknown index [.alerts-streams.alerts-default]')
    );

    const result = await collectQueryData({ query: makeQuery(), esClient });

    expect(result).toBeUndefined();
  });

  it('rethrows non-Unknown-index verification_exception (e.g. unknown column)', async () => {
    const { esClient, esqlQuery } = createMocks();
    // Simulates an ES|QL regression — unknown column, malformed query, mapping
    // mismatch. Must NOT be silently swallowed as "alerts index missing".
    esqlQuery.mockRejectedValue(
      makeEsError(400, 'verification_exception', 'Unknown column [kibana.alert.rule.bogus_field]')
    );

    await expect(collectQueryData({ query: makeQuery(), esClient })).rejects.toThrow(
      /verification_exception|Unknown column/
    );
  });
});
