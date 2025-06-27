/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AnonymizationRule,
  AnonymizationEntity,
  AnonymizationOutput,
  RegexAnonymizationRule,
  Anonymization,
} from '@kbn/inference-common';
import { withInferenceSpan } from '@kbn/inference-tracing';
import { Message } from '@kbn/inference-common';
import { chunk, merge, partition } from 'lodash';
import objectHash from 'object-hash';
import { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import pLimit from 'p-limit';
import { getAnonymizableMessageParts } from './get_anonymizable_message_parts';

const DEFAULT_MAX_CONCURRENT_REQUESTS = 5;
const DEFAULT_BATCH_SIZE = 1_000;
const DEFAULT_CHUNK_SIZE = 1_000;

export interface InferenceChunk {
  chunkText: string;
  charStartOffset: number;
}

export function chunkText(text: string, maxChars = DEFAULT_CHUNK_SIZE): InferenceChunk[] {
  const chunks: InferenceChunk[] = [];
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push({
      chunkText: text.slice(i, i + maxChars),
      charStartOffset: i,
    });
  }
  return chunks;
}

function getEntityMask(entity: { class_name: string; value: string }) {
  const hash = objectHash({
    value: entity.value,
    class_name: entity.class_name,
  });
  return `${entity.class_name}_${hash}`;
}

export async function anonymize({
  input,
  anonymizationRules,
  esClient,
}: {
  input: string;
  anonymizationRules: AnonymizationRule[];
  esClient: ElasticsearchClient;
}): Promise<{ output: string; anonymizations: Anonymization[] }> {
  const [regexRules, nerRules] = partition(
    anonymizationRules,
    (rule): rule is RegexAnonymizationRule => rule.type === 'RegExp'
  );

  const entities: Array<{ rule: RegexAnonymizationRule; entity: AnonymizationEntity }> = [];

  let output = input;

  regexRules.forEach((rule) => {
    const regex = new RegExp(rule.pattern);

    let match: RegExpMatchArray | null = null;
    while ((match = regex.exec(output))) {
      const value = match[0];

      const mask = getEntityMask({
        value,
        class_name: rule.entityClass,
      });

      output = output.replace(match[0], mask);

      entities.push({
        entity: {
          value,
          class_name: rule.entityClass,
          mask,
        },
        rule,
      });
    }
  });

  let index = 0;

  const anonymizations: Anonymization[] = [];
  entities.forEach(({ entity, rule }) => {
    const start = output.indexOf(entity.mask, index);
    index = start + entity.mask.length;
    anonymizations.push({
      entity,
      rule: {
        type: rule.type,
      },
    });
  });

  if (!nerRules.length) {
    return {
      output,
      anonymizations,
    };
  }

  // Maximum number of concurrent requests
  const limiter = pLimit(DEFAULT_MAX_CONCURRENT_REQUESTS);

  for (const nerRule of nerRules) {
    let offset = 0;
    // Chunk the text due to token limit of model
    const chunks = chunkText(output);
    // Limit chunks into batches per request
    const batches = chunk(chunks, DEFAULT_BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batchChunks = batches[batchIndex];

      const results = await limiter(async () =>
        withInferenceSpan('infer_ner', async () => {
          let response;
          try {
            const docs = batchChunks.map((batchChunk) => ({ text_field: batchChunk.chunkText }));
            response = await esClient.ml.inferTrainedModel({
              model_id: nerRule.modelId,
              docs,
            });
          } catch (error) {
            throw new Error(`Inference failed for NER model '${nerRule.modelId}'`, {
              cause: error,
            });
          }
          return response?.inference_results || [];
        })
      );

      // Process each chunk with its result
      for (let i = 0; i < batchChunks.length; i++) {
        const batchChunk = batchChunks[i];
        const result = results[i];

        if (!result || !result.entities) continue;

        // Process each entity in this chunk
        for (const entityMatch of result.entities) {
          // Calculate the positions in the chunk
          const from = batchChunk.charStartOffset + entityMatch.start_pos + offset;
          const to = batchChunk.charStartOffset + entityMatch.end_pos + offset;

          const before = output.slice(0, from);
          const after = output.slice(to);

          // get the original entity text to avoid normalization from the model
          const entityText = output.slice(from, to);
          // Create the entity object
          const entity = {
            class_name: entityMatch.class_name,
            value: entityText,
          };

          const mask = getEntityMask(entity);

          // Update offset based on length difference
          offset += mask.length - (to - from);
          anonymizations.push({
            entity: {
              ...entity,
              mask,
            },
            rule: nerRule,
          });
          output = before + mask + after;
        }
      }
    }
  }

  return {
    output,
    anonymizations,
  };
}

export async function anonymizeMessages({
  messages,
  anonymizationRules,
  esClient,
  logger,
}: {
  messages: Message[];
  anonymizationRules: AnonymizationRule[];
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<AnonymizationOutput> {
  const rules = anonymizationRules.filter((rule) => rule.enabled);
  if (!rules.length) {
    return {
      messages,
      anonymizations: [],
    };
  }
  const toAnonymize = messages.map(getAnonymizableMessageParts);

  const { output, anonymizations } = await anonymize({
    input: JSON.stringify(toAnonymize),
    anonymizationRules: rules,
    esClient,
  });
  try {
    const anonymized = JSON.parse(output) as typeof toAnonymize;

    const anonymizedMessages = messages.map((message, index) => {
      return merge({}, message, anonymized[index]);
    });

    return {
      messages: anonymizedMessages,
      anonymizations,
    };
  } catch (error) {
    logger.error('JSON.parse error trying to anonymize messages', error);
    throw error;
  }
}
