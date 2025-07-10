/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Anonymization, NamedEntityRecognitionRule } from '@kbn/inference-common';
import { ElasticsearchClient } from '@kbn/core/server';
import { chunk, mapValues } from 'lodash';
import pLimit from 'p-limit';
import { withInferenceSpan } from '@kbn/inference-tracing';
import { AnonymizationState } from './types';
import { getEntityMask } from './get_entity_mask';

const MAX_TOKENS_PER_DOC = 1_000;

function chunkText(text: string, maxChars = MAX_TOKENS_PER_DOC): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars));
  }
  return chunks;
}

const DEFAULT_BATCH_SIZE = 1_000;
const DEFAULT_MAX_CONCURRENT_REQUESTS = 5;

/**
 * Executes a NER anonymization rule, by:
 *
 * - For each record, iterate over the key-value pairs.
 * - Split up each value in strings < MAX_TOKENS_PER_DOC, to stay within token limits
 * for NER tasks.
 * - Push each part to an array of strings, track the position in the array, so we can
 * reconstruct the records later.
 * - Create a {text_field:string} document for each part, and run NER inference over
 * these documents in batches.
 * - After retrieving the results:
 *  - Iterate over the _input_ and find the inferred results by key + position
 *  - For each detected entity, replace with a mask
 *  - Append the original value & masked value to `state.anonymizations`
 *  - Return the text with the masked values
 *  - Reconstruct the original record
 */
export async function executeNerRule({
  state,
  rule,
  esClient,
}: {
  state: AnonymizationState;
  rule: NamedEntityRecognitionRule;
  esClient: ElasticsearchClient;
}): Promise<AnonymizationState> {
  const anonymizations: Anonymization[] = state.anonymizations.concat();

  const allowedNerEntities = rule.allowedEntityClasses;

  const limiter = pLimit(DEFAULT_MAX_CONCURRENT_REQUESTS);

  const allTexts: string[] = [];
  const allPositions: Array<Record<string, number[]>> = [];

  state.records.forEach((record) => {
    const positionsForRecord: Record<string, number[]> = {};
    allPositions.push(positionsForRecord);
    Object.entries(record).forEach(([key, value]) => {
      const positions: number[] = [];
      positionsForRecord[key] = positions;
      const texts = chunkText(value);
      texts.forEach((text) => {
        const idx = allTexts.length;
        positions.push(idx);
        allTexts.push(text);
      });
    });
  });

  const batched = chunk(allTexts, DEFAULT_BATCH_SIZE);

  const results = (
    await Promise.all(
      batched.map(async (batch) => {
        return await limiter(() =>
          withInferenceSpan('infer_ner', async (span) => {
            try {
              const response = await esClient.ml.inferTrainedModel({
                model_id: rule.modelId,
                docs: batch.map((text) => ({ text_field: text })),
              });

              return response.inference_results;
            } catch (error) {
              throw new Error(`Inference failed for NER model '${rule.modelId}'`, {
                cause: error,
              });
            }
          })
        );
      })
    )
  ).flat();

  const nextRecords = state.records.map((record, idx) => {
    const nerInput = allPositions[idx];

    return mapValues(record, (value, key) => {
      const positions = nerInput[key];
      return positions
        .map((position) => {
          const nerOutput = results[position];

          let offset = 0;

          let anonymizedValue = allTexts[position];

          for (const entity of (nerOutput.entities ?? []).filter((e) =>
            allowedNerEntities ? allowedNerEntities.includes(e.class_name as any) : true
          )) {
            const from = entity.start_pos + offset;
            const to = entity.end_pos + offset;

            const before = anonymizedValue.slice(0, from);
            const after = anonymizedValue.slice(to);

            const entityText = anonymizedValue.slice(from, to);

            const mask = getEntityMask({ class_name: entity.class_name, value: entityText });

            anonymizedValue = before + mask + after;
            offset += mask.length - entityText.length;
            anonymizations.push({
              entity: { class_name: entity.class_name, value: entityText, mask },
              rule,
            });
          }

          return anonymizedValue;
        })
        .join('');
    });
  });

  return {
    records: nextRecords,
    anonymizations,
  };
}
