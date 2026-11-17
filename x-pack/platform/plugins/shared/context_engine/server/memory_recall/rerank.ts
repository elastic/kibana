/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { RECALL_RERANK_INFERENCE_ID } from '../../common/constants';
import type { RecallCandidate } from './types';

const RERANK_INPUT_CHARS = 1000;

/** Scores every candidate against the query in one reranker call, most relevant first. */
export const rerankCandidates = async ({
  esClient,
  query,
  candidates,
}: {
  esClient: ElasticsearchClient;
  query: string;
  candidates: RecallCandidate[];
}): Promise<RecallCandidate[]> => {
  if (candidates.length === 0) {
    return [];
  }
  const { rerank } = await esClient.inference.rerank({
    inference_id: RECALL_RERANK_INFERENCE_ID,
    query,
    input: candidates.map(({ content }) => content.slice(0, RERANK_INPUT_CHARS)),
  });
  return rerank.map(({ index }) => candidates[index]);
};
