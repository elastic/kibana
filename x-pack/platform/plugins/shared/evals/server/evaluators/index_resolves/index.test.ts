/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { indexResolvesEvaluator } from '.';
import type { EvidenceRound } from '../evidence/types';
import type { EvaluatorContext } from '../types';

const traceId = 'trace-1';
const log = { warn: jest.fn(), debug: jest.fn() } as unknown as EvaluatorContext['log'];

const round = (message: string): EvidenceRound => ({
  input: { message: 'query' },
  steps: [],
  response: { message },
});

const createEsClient = (resolveIndexImpl?: (p: { name: string }) => Promise<unknown>) => {
  const resolveIndexMock = jest.fn(resolveIndexImpl ?? (async () => ({ indices: [{}] })));
  return {
    esClient: {
      indices: { resolveIndex: resolveIndexMock },
    } as unknown as ElasticsearchClient,
    resolveIndexMock,
  };
};

describe('skill-index-resolves', () => {
  it('passes when no patterns are present', async () => {
    const { esClient } = createEsClient();
    await expect(
      indexResolvesEvaluator.evaluate({
        trace: { traceId, esClient },
        round: round('Nothing to see'),
        log,
      })
    ).resolves.toEqual({
      scores: [
        {
          name: 'skill-index-resolves',
          score: 1,
          label: 'pass',
          explanation: 'No index patterns to resolve',
        },
      ],
    });
  });

  it('resolves FROM-clause patterns via resolveIndex', async () => {
    const { esClient, resolveIndexMock } = createEsClient();
    await indexResolvesEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('Query FROM logs-endpoint.events.process-* returns rows'),
      log,
    });
    expect(resolveIndexMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'logs-endpoint.events.process-*' })
    );
  });

  it('fails when the only referenced pattern resolves to nothing', async () => {
    const { esClient } = createEsClient(async () => ({ indices: [] }));
    const result = await indexResolvesEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('Query FROM logs-endpoint.events.process-* returns rows'),
      log,
    });
    expect(result.scores[0].score).toBe(0);
    // Single-pattern soft-fail threshold: 0 < 0.7 → fail
    expect(result.scores[0].label).toBe('fail');
    expect(result.scores[0].explanation).toContain('logs-endpoint.events.process-*');
  });

  it('warns when at least 70% of patterns resolve', async () => {
    const { esClient } = createEsClient(async ({ name }) => ({
      indices: name === 'missing-*' ? [] : [{}],
    }));
    const result = await indexResolvesEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round(
        'FROM a-*, b-*, c-*, d-*, e-*, f-*, g-*, h-*, i-*, missing-*\n| LIMIT 1 on those'
      ),
      log,
    });
    expect(result.scores[0].score).toBeCloseTo(0.9);
    expect(result.scores[0].label).toBe('warn');
  });

  it.each(['well-known', 'file.txt', 'skill-pii', 'word.'])(
    'does not treat the bare token %j as an index pattern',
    async (token) => {
      const { esClient, resolveIndexMock } = createEsClient();
      await indexResolvesEvaluator.evaluate({
        trace: { traceId, esClient },
        round: round(`This is a ${token} thing, see ${token}`),
        log,
      });
      expect(resolveIndexMock).not.toHaveBeenCalled();
    }
  );

  it('does not treat a hyphenated word at the end of a sentence as an index', async () => {
    const { esClient, resolveIndexMock } = createEsClient();
    await indexResolvesEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round('The skill is well-known. Edit file.txt and skill-pii.'),
      log,
    });
    expect(resolveIndexMock).not.toHaveBeenCalled();
  });

  it.each([
    ['bare wildcard shape', 'Data lives in logs-* today', 'logs-*'],
    [
      'hidden alerts index',
      'Check .alerts-security.alerts-default now',
      '.alerts-security.alerts-default',
    ],
    [
      'name-* shape with trailing punctuation',
      'Search metrics-system.cpu-*.',
      'metrics-system.cpu-*',
    ],
    ['index: context', 'index: my-custom-index', 'my-custom-index'],
    ['backticked token', 'Use `well-known` here', 'well-known'],
  ])('extracts a pattern from %s', async (_label, text, expected) => {
    const { esClient, resolveIndexMock } = createEsClient();
    await indexResolvesEvaluator.evaluate({
      trace: { traceId, esClient },
      round: round(text),
      log,
    });
    expect(resolveIndexMock).toHaveBeenCalledWith(expect.objectContaining({ name: expected }));
  });

  it('still resolves patterns found only in tool results', async () => {
    const { esClient, resolveIndexMock } = createEsClient();
    await indexResolvesEvaluator.evaluate({
      trace: { traceId, esClient },
      round: {
        input: { message: 'query' },
        steps: [{ tool_id: 'x', arguments: {}, result: 'FROM logs-foo-*\n| LIMIT 1' }],
        response: { message: 'done' },
      },
      log,
    });
    expect(resolveIndexMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'logs-foo-*' }));
  });
});
