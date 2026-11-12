/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the Elastic License 2.0, the GNU Affero General Public License
 * v3.0 only, or the Server Side Public License v 1".
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

  it('warns when a pattern resolves to nothing', async () => {
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
});
