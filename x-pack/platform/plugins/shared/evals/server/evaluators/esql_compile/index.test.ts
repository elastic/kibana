/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { esqlCompileEvaluator } from '.';
import type { EvidenceRound } from '../evidence/types';
import type { EvaluatorContext } from '../types';

const traceId = 'trace-1';
const log = { warn: jest.fn(), debug: jest.fn() } as unknown as EvaluatorContext['log'];

const round = (message: string): EvidenceRound => ({
  input: { message: 'query' },
  steps: [],
  response: { message },
});

const createEsClient = (rejects?: Error) => {
  const requestMock = jest.fn();
  if (rejects) {
    requestMock.mockRejectedValue(
      Object.assign(rejects, {
        meta: { body: { error: { reason: rejects.message } } },
      })
    );
  } else {
    requestMock.mockResolvedValue({});
  }
  return {
    esClient: { transport: { request: requestMock } } as unknown as ElasticsearchClient,
    requestMock,
  };
};

describe('esql-compile', () => {
  it('passes when no ES|QL is present', async () => {
    const { esClient } = createEsClient();
    await expect(
      esqlCompileEvaluator.evaluate({
        trace: { traceId, esClient },
        round: round('No queries here'),
        log,
      })
    ).resolves.toEqual({
      scores: [
        {
          name: 'esql-compile',
          score: 1,
          label: 'pass',
          explanation: 'No ES|QL queries to compile',
        },
      ],
    });
  });

  it('compiles fenced ES|QL blocks and leaves an existing LIMIT untouched', async () => {
    const { esClient, requestMock } = createEsClient();
    await esqlCompileEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('```esql\nFROM logs-*\n| LIMIT 10\n```'),
      log,
    });
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/_query',
        body: { query: 'FROM logs-*\n| LIMIT 10' },
      })
    );
  });

  it('appends LIMIT 0 when the query has no LIMIT', async () => {
    const { esClient, requestMock } = createEsClient();
    await esqlCompileEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('```esql\nFROM logs-*\n| WHERE x > 1\n```'),
      log,
    });
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/_query',
        body: { query: 'FROM logs-*\n| WHERE x > 1 | LIMIT 0' },
      })
    );
  });

  it('fails when ES rejects the query', async () => {
    const { esClient } = createEsClient(new Error('Unknown column [foo]'));
    const result = await esqlCompileEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('```esql\nFROM logs-*\n| EVAL bad = foo\n```'),
      log,
    });
    expect(result.scores[0].score).toBe(0);
    expect(result.scores[0].label).toBe('fail');
    expect(result.scores[0].explanation).toContain('Unknown column');
  });

  it('scores partial failures proportionally', async () => {
    const { esClient, requestMock } = createEsClient();
    requestMock.mockImplementation(({ body }: { body: { query: string } }) =>
      body.query.includes('bad-index')
        ? Promise.reject(new Error('index not found'))
        : Promise.resolve({})
    );
    const result = await esqlCompileEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('```esql\nFROM logs-*\n```\n```esql\nFROM bad-index-xyz\n```'),
      log,
    });
    expect(result.scores[0].score).toBe(0.5);
    expect(result.scores[0].label).toBe('fail');
  });
});
