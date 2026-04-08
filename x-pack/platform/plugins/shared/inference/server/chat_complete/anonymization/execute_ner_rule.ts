/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Anonymization, NamedEntityRecognitionRule } from '@kbn/inference-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import { chunk, mapValues } from 'lodash';
import pLimit from 'p-limit';
import { withActiveInferenceSpan } from '@kbn/inference-tracing';
import { isNotFoundError, isResponseError } from '@kbn/es-errors';
import type { AnonymizationState } from './types';
import { getEntityMask } from './get_entity_mask';

// structured data can end up being a token per character.
// since the limit is 512 tokens, to avoid truncating, set the max to 512
const MAX_TOKENS_PER_DOC = 512;
const NER_DOCS_URL_DOWNLOAD_MODEL =
  'https://www.elastic.co/docs/explore-analyze/machine-learning/nlp/ml-nlp-ner-example';
const NER_DOCS_URL_DEPLOY_MODEL =
  'https://www.elastic.co/docs/explore-analyze/machine-learning/nlp/ml-nlp-deploy-model';

function chunkText(text: string, maxChars = MAX_TOKENS_PER_DOC): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars));
  }
  return chunks;
}

function isModelNotDeployedError(error: unknown): boolean {
  if (!isResponseError(error)) {
    return false;
  }

  const reason = error.body?.error?.reason ?? '';
  return reason.includes('must be deployed') || reason.includes('Please deploy');
}

const DEFAULT_BATCH_SIZE = 1_000;
const DEFAULT_MAX_CONCURRENT_REQUESTS = 7;

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
          withActiveInferenceSpan(
            'InferTrainedModel',
            {
              attributes: {},
            },
            async (span) => {
              const docs = batch.map((text) => ({ text_field: text }));

              span?.setAttribute('input.value', JSON.stringify(docs));

              const response = await esClient.ml.inferTrainedModel({
                model_id: rule.modelId,
                docs,
                timeout: `${rule.timeoutSeconds ?? 30}s`,
              });

              span?.setAttribute('output.value', JSON.stringify(response.inference_results));

              return response.inference_results;
            }
          )
        ).catch((error) => {
          // The model was not found, probably not downloaded.
          if (isNotFoundError(error)) {
            throw new Error(
              `The NER model '${rule.modelId}' was not found. ` +
                `Please download and deploy the model before enabling anonymization. ` +
                `For instructions, see: ${NER_DOCS_URL_DOWNLOAD_MODEL}`,
              { cause: error }
            );
          }

          // The model is available but not currently deployed.
          if (isModelNotDeployedError(error)) {
            throw new Error(
              `The NER model '${rule.modelId}' is not deployed. ` +
                `Please deploy the model before enabling anonymization. ` +
                `For instructions, see: ${NER_DOCS_URL_DEPLOY_MODEL}`,
              { cause: error }
            );
          }

          // Other error, rethrow.
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Inference failed for NER model '${rule.modelId}': ${errorMessage}`, {
            cause: error,
          });
        });
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
