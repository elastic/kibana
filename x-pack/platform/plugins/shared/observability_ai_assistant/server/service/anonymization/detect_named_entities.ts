/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import pLimit from 'p-limit';
import type { Logger } from '@kbn/core/server';
import { ElasticsearchClient } from '@kbn/core/server';
import { withInferenceSpan } from '@kbn/inference-tracing';
import { DetectedEntity, InferenceChunk, NerAnonymizationRule } from '../../../common/types';
import { redactEntities, NER_MODEL_ID } from '../../../common/utils/anonymization/redaction';
import { chunkText } from './chunk_text';
import { getEntityHash } from './get_entity_hash';

const DEFAULT_MAX_CONCURRENT_REQUESTS = 5;

async function detectNamedEntitiesForModel({
  modelId,
  chunks,
  logger,
  esClient,
}: {
  modelId: string;
  chunks: InferenceChunk[];
  logger: Logger;
  esClient: { asCurrentUser: ElasticsearchClient };
}): Promise<DetectedEntity[]> {
  logger.debug(`Detecting named entities with model ${modelId} in ${chunks.length} text chunks`);

  // Maximum number of concurrent requests to the ML model
  const limiter = pLimit(DEFAULT_MAX_CONCURRENT_REQUESTS);

  // Batch size - number of documents to send in each request
  const BATCH_SIZE = 10;

  // Create batches of chunks for the inference request
  const batches = chunk(chunks, BATCH_SIZE);
  logger.debug(`Processing ${batches.length} batches of up to ${BATCH_SIZE} chunks each`);

  const tasks = batches.map((batchChunks) =>
    limiter(async () =>
      withInferenceSpan('infer_ner', async () => {
        let response;
        try {
          response = await esClient.asCurrentUser.ml.inferTrainedModel({
            model_id: modelId,
            docs: batchChunks.map((batchChunk) => ({ text_field: batchChunk.chunkText })),
          });
        } catch (error) {
          throw new Error('NER inference failed', { cause: error });
        }

        // Process results from all documents in the batch
        const batchResults: DetectedEntity[] = [];
        const inferenceResults = response?.inference_results || [];

        if (inferenceResults.length !== batchChunks.length) {
          logger.warn(
            `NER returned ${inferenceResults.length} results for ${batchChunks.length} docs in batch`
          );
        }

        // Match results with their original chunks to maintain offsets
        inferenceResults.forEach((result, index) => {
          const batchChunk = batchChunks[index];
          const entities = result.entities || [];

          batchResults.push(
            ...entities.map((e) => ({
              ...e,
              start_pos: e.start_pos + batchChunk.charStartOffset,
              end_pos: e.end_pos + batchChunk.charStartOffset,
              type: 'ner' as const,
              hash: getEntityHash(e.entity, e.class_name),
            }))
          );
        });

        return batchResults;
      })
    )
  );

  const results = await Promise.all(tasks);
  const flatResults = results.flat();
  logger.debug(`Total entities detected: ${flatResults.length}`);
  return flatResults;
}

export async function detectNamedEntities(
  content: string,
  rules: NerAnonymizationRule[] = [],
  logger: Logger,
  esClient: { asCurrentUser: ElasticsearchClient }
): Promise<DetectedEntity[]> {
  // Only run NER if we have NER rules enabled
  if (!rules.length) {
    return [];
  }

  const nerEntities: DetectedEntity[] = [];

  let workingText = content;

  for (const rule of rules) {
    const modelId = rule.modelId ?? NER_MODEL_ID;
    const chunks = chunkText(workingText);
    const detected = await detectNamedEntitiesForModel({ modelId, chunks, logger, esClient });

    if (detected.length) {
      nerEntities.push(...detected);
      // redact already-found entities so subsequent models cannot see them
      workingText = redactEntities(workingText, detected);
    }
  }

  return nerEntities;
}
