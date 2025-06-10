/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RedactionConfiguration,
  RegExpRule,
  RedactionEntity,
  Redaction,
  RedactionOutput,
} from '@kbn/inference-common';
import { Message } from '@kbn/inference-common';
import { chunk, merge, partition } from 'lodash';
import objectHash from 'object-hash';
import { ElasticsearchClient } from '@kbn/core/server';
import pLimit from 'p-limit';
import { getRedactableMessageParts } from './get_redactable_message_parts';

const DEFAULT_MAX_CONCURRENT_REQUESTS = 5;
const DEFAULT_BATCH_SIZE = 1000;

export interface InferenceChunk {
  chunkText: string;
  charStartOffset: number;
}

export function chunkText(text: string, maxChars = 1_000): InferenceChunk[] {
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
  return objectHash({
    value: entity.value,
    class_name: entity.class_name,
  });
}

async function redact({
  input,
  redactionConfiguration,
  esClient,
}: {
  input: string;
  redactionConfiguration: RedactionConfiguration;
  esClient: ElasticsearchClient;
}): Promise<{ output: string; redactions: Redaction[] }> {
  const rules = redactionConfiguration.rules.filter((rule) => rule.enabled);

  const [regexRules, nerRules] = partition(
    rules,
    (rule): rule is RegExpRule => rule.type === 'RegExp'
  );

  const entities: Array<{ rule: RegExpRule; entity: RedactionEntity }> = [];

  let output = input;

  regexRules.forEach((rule) => {
    const regex = new RegExp(rule.pattern);

    let match: RegExpMatchArray | null = null;
    while ((match = regex.exec(output))) {
      const value = match[0];

      const mask = getEntityMask({
        value,
        class_name: rule.class_name,
      });

      output = output.replace(match[0], mask);

      entities.push({
        entity: {
          value,
          class_name: rule.class_name,
          mask,
        },
        rule,
      });
    }
  });

  let index = 0;

  const redactions: Redaction[] = [];
  entities.forEach(({ entity, rule }) => {
    const start = output.indexOf(entity.mask, index);
    index = start + entity.mask.length;
    redactions.push({
      entity,
      rule: {
        type: rule.type,
      },
    });
  });

  if (!nerRules.length) {
    return {
      output,
      redactions,
    };
  }

  // Maximum number of concurrent requests to the ML model
  const limiter = pLimit(DEFAULT_MAX_CONCURRENT_REQUESTS);

  // Batch size - number of documents to send in each request

  const chunks = chunkText(output);

  // Create batches of chunks for the inference request
  const batches = chunk(chunks, DEFAULT_BATCH_SIZE);

  for (const nerRule of nerRules) {
    let offset: number = 0;

    const allInferenceResults = await Promise.all(
      batches.map(async (batchChunks) => {
        const response = await limiter(() =>
          esClient.ml.inferTrainedModel({
            model_id: nerRule.model_id,
            docs: batchChunks.map((batchChunk) => ({ text_field: batchChunk.chunkText })),
          })
        );

        const inferenceResults = response?.inference_results || [];

        return inferenceResults;
      })
    );

    allInferenceResults.flat().forEach((result) => {
      result.entities?.forEach((entityMatch) => {
        const from = entityMatch.start_pos + offset;
        const to = entityMatch.end_pos + offset;

        const before = output.slice(0, from);
        const after = output.slice(to);

        const entity = {
          class_name: entityMatch.class_name,
          value: entityMatch.entity,
        };

        const mask = getEntityMask(entity);

        offset += to - from - mask.length;
        redactions.push({
          entity: {
            ...entity,
            mask,
          },
          rule: nerRule,
        });
        output = before + mask + after;
      });
    });
  }

  return {
    output,
    redactions,
  };
}

export async function redactMessages({
  messages,
  redactionConfiguration,
  esClient,
}: {
  messages: Message[];
  redactionConfiguration: RedactionConfiguration;
  esClient: ElasticsearchClient;
}): Promise<RedactionOutput> {
  const toRedact = messages.map(getRedactableMessageParts);

  const { output, redactions } = await redact({
    input: JSON.stringify(toRedact),
    redactionConfiguration,
    esClient,
  });

  const redacted = JSON.parse(output) as typeof toRedact;

  const redactedMessages = messages.map((message, index) => {
    return merge({}, message, redacted[index]);
  });

  return {
    messages: redactedMessages,
    redactions,
  };
}
