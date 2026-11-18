/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { RECALL_RERANK_INFERENCE_ID } from '../../common/constants';
import { rerankCandidates } from './rerank';
import type { RecallCandidate } from './types';

const candidate = (id: string, content: string): RecallCandidate => ({
  id,
  source: 'ai_index',
  content,
});

describe('rerankCandidates', () => {
  let inference: jest.Mock;
  let esClient: ElasticsearchClient;

  beforeEach(() => {
    inference = jest.fn();
    esClient = { inference: { rerank: inference } } as unknown as ElasticsearchClient;
  });

  it('orders candidates by the reranker response', async () => {
    inference.mockResolvedValue({ rerank: [{ index: 1 }, { index: 0 }] });

    const ranked = await rerankCandidates({
      esClient,
      query: 'why was checkout slow?',
      candidates: [candidate('a', 'first'), candidate('b', 'second')],
    });

    expect(ranked.map(({ id }) => id)).toEqual(['b', 'a']);
    expect(inference).toHaveBeenCalledWith({
      inference_id: RECALL_RERANK_INFERENCE_ID,
      query: 'why was checkout slow?',
      input: ['first', 'second'],
    });
  });

  it('sends the first 1,000 characters of each candidate', async () => {
    inference.mockResolvedValue({ rerank: [{ index: 0 }] });

    await rerankCandidates({
      esClient,
      query: 'q',
      candidates: [candidate('a', 'x'.repeat(5000))],
    });

    expect(inference.mock.calls[0][0].input[0]).toHaveLength(1000);
  });

  it('skips the reranker with no candidates', async () => {
    expect(await rerankCandidates({ esClient, query: 'q', candidates: [] })).toEqual([]);
    expect(inference).not.toHaveBeenCalled();
  });
});
