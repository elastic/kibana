/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  it('returns invalid when execution against Elasticsearch fails', async () => {
    esClient.esql.query.mockRejectedValue(new Error('index_not_found_exception'));

    const result = await verifier.verify(
      { content: '```esql\nFROM my-index | LIMIT 10\n```' },
      context
    );

    expect(result.status).toBe('invalid');
    expect(result.messages[0]).toContain('index_not_found_exception');
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
