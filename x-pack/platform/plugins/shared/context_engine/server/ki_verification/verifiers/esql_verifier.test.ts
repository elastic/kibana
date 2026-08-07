/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createEsqlVerifier } from './esql_verifier';
import type { KiVerifierContext } from '../types';

describe('createEsqlVerifier', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let context: KiVerifierContext;
  const verifier = createEsqlVerifier();

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    context = {
      esClient,
      logger: loggingSystemMock.createLogger(),
    };
  });

  it('returns valid for a fenced block with a valid query and executes it with LIMIT 0', async () => {
    const result = await verifier.verify(
      { content: 'Use this query:\n```esql\nFROM my-index | LIMIT 10\n```\n' },
      context
    );

    expect(result.status).toBe('valid');
    expect(result.messages).toEqual(['Verified 1 ES|QL query(ies)']);
    expect(esClient.esql.query).toHaveBeenCalledWith(
      { query: 'FROM my-index | LIMIT 10\n| LIMIT 0' },
      expect.objectContaining({ requestTimeout: '10s' })
    );
  });

  it('returns invalid for a syntactically invalid query without executing it', async () => {
    const result = await verifier.verify({ content: '```esql\nFROM | WHERE\n```' }, context);

    expect(result.status).toBe('invalid');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toContain('FROM | WHERE');
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });

  it('returns invalid when Elasticsearch rejects the query with a 400', async () => {
    esClient.esql.query.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 400,
        headers: {},
        meta: {} as never,
        body: { error: { type: 'verification_exception', reason: 'Unknown index [my-index]' } },
        warnings: null,
      })
    );

    const result = await verifier.verify(
      { content: '```esql\nFROM my-index | LIMIT 10\n```' },
      context
    );

    expect(result.status).toBe('invalid');
    expect(result.messages[0]).toContain('Invalid ES|QL query');
  });

  it('returns error when execution fails for reasons other than query rejection', async () => {
    esClient.esql.query.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 403,
        headers: {},
        meta: {} as never,
        body: { error: { type: 'security_exception', reason: 'action unauthorized' } },
        warnings: null,
      })
    );

    const result = await verifier.verify(
      { content: '```esql\nFROM my-index | LIMIT 10\n```' },
      context
    );

    expect(result.status).toBe('error');
    expect(result.messages[0]).toContain('Could not verify ES|QL query');
  });

  it('returns error when execution fails with a non-response error', async () => {
    esClient.esql.query.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const result = await verifier.verify(
      { content: '```esql\nFROM my-index | LIMIT 10\n```' },
      context
    );

    expect(result.status).toBe('error');
    expect(result.messages[0]).toContain('ECONNREFUSED');
  });

  it('reports invalid over error when different queries fail differently', async () => {
    esClient.esql.query.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const result = await verifier.verify(
      {
        content: [
          '```esql',
          'FROM my-index | LIMIT 10',
          '```',
          '```esql',
          'FROM | WHERE',
          '```',
        ].join('\n'),
      },
      context
    );

    expect(result.status).toBe('invalid');
  });

  it('returns skipped when the KI contains no ES|QL', async () => {
    const result = await verifier.verify(
      { title: 'No queries here', content: 'Just some text.' },
      context
    );

    expect(result).toEqual({
      verifier: 'esql',
      status: 'skipped',
      messages: ['No ES|QL queries found in knowledge item'],
    });
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });

  it('verifies a query from attributes.esql', async () => {
    const result = await verifier.verify(
      { attributes: { esql: 'FROM my-index | LIMIT 10' } },
      context
    );

    expect(result.status).toBe('valid');
    expect(esClient.esql.query).toHaveBeenCalledWith(
      { query: 'FROM my-index | LIMIT 10\n| LIMIT 0' },
      expect.objectContaining({ requestTimeout: '10s' })
    );
  });

  it('returns invalid when one of multiple fenced blocks is broken', async () => {
    const result = await verifier.verify(
      {
        content: [
          '```esql',
          'FROM my-index | LIMIT 10',
          '```',
          'And a broken one:',
          '```esql',
          'FROM | WHERE',
          '```',
        ].join('\n'),
      },
      context
    );

    expect(result.status).toBe('invalid');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toContain('FROM | WHERE');
  });
});
