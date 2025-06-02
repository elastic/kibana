/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withInferenceSpan } from '@kbn/inference-plugin/server';
import { ElasticsearchClient } from '@kbn/core/server';
import objectHash from 'object-hash';
import pLimit from 'p-limit';

import type { Logger } from '@kbn/core/server';
import { chunk } from 'lodash';
import { unhashString } from '../../../common/utils/anonymization/redaction';
import { buildDetectedEntitiesMap } from '../../../common/utils/anonymization/build_detected_entities_map';
import { detectRegexEntities } from './detect_regex_entities';
import { deanonymizeText } from './deanonymize_text';
import { chunkText } from './chunk_text';
import {
  type DetectedEntity,
  DetectedEntityType,
  type InferenceChunk,
  type Message,
} from '../../../common/types';

const NER_MODEL_ID = 'elastic__distilbert-base-uncased-finetuned-conll03-english';
const DEFAULT_MAX_CONCURRENT_REQUESTS = 5;

export interface AnonymizationRule {
  id: string;
  entityClass: string;
  type: 'regex' | 'ner';
  pattern?: string;
  enabled: boolean;
  builtIn: boolean;
  description?: string;
  normalize?: boolean;
}

export interface Dependencies {
  esClient: {
    asCurrentUser: ElasticsearchClient;
  };
  logger: Logger;
  anonymizationRules: string;
}

export class AnonymizationService {
  private readonly esClient: { asCurrentUser: ElasticsearchClient };
  private readonly logger: Logger;
  private rules: AnonymizationRule[];

  constructor({ esClient, logger, anonymizationRules }: Dependencies) {
    this.esClient = esClient;
    this.logger = logger;
    this.rules = JSON.parse(anonymizationRules || '[]');
  }

  private async detectNamedEntities(chunks: InferenceChunk[]): Promise<DetectedEntity[]> {
    this.logger.debug(`Detecting named entities in ${chunks.length} text chunks`);

    // Maximum number of concurrent requests to the ML model
    const limiter = pLimit(DEFAULT_MAX_CONCURRENT_REQUESTS);

    // Batch size - number of documents to send in each request
    const BATCH_SIZE = 10;

    // Create batches of chunks for the inference request
    const batches = chunk(chunks, BATCH_SIZE);
    this.logger.debug(`Processing ${batches.length} batches of up to ${BATCH_SIZE} chunks each`);

    const tasks = batches.map((batchChunks) =>
      limiter(async () =>
        withInferenceSpan('infer_ner', async () => {
          let response;
          try {
            response = await this.esClient.asCurrentUser.ml.inferTrainedModel({
              model_id: NER_MODEL_ID,
              docs: batchChunks.map((batchChunk) => ({ text_field: batchChunk.chunkText })),
            });
          } catch (error) {
            this.logger.error(new Error('NER inference failed', { cause: error }));
            return [];
          }

          // Process results from all documents in the batch
          const batchResults: DetectedEntity[] = [];
          const inferenceResults = response?.inference_results || [];

          if (inferenceResults.length !== batchChunks.length) {
            this.logger.warn(
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
                hash: objectHash({ entity: e.entity, class_name: e.class_name }),
              }))
            );
          });

          return batchResults;
        })
      )
    );

    const results = await Promise.all(tasks);
    const flatResults = results.flat();
    this.logger.debug(`Total entities detected: ${flatResults.length}`);
    return flatResults;
  }

  private async detectEntities(content: string): Promise<DetectedEntity[]> {
    // Skip detection if there's no content
    if (!content || !content.trim()) {
      return [];
    }

    this.logger.debug(`Detecting entities in text content`);

    // Filter rules by type
    const nerRules = this.rules.filter((rule) => rule.type === 'ner' && rule.enabled);
    const regexRules = this.rules.filter((rule) => rule.type === 'regex' && rule.enabled);

    // Only run NER if we have NER rules enabled
    let nerEntities: DetectedEntity[] = [];
    if (nerRules.length > 0) {
      // Detect entities using NER
      const chunks = chunkText(content);
      nerEntities = await this.detectNamedEntities(chunks);
    }

    // Detect entities using regex patterns
    const regexEntities = detectRegexEntities(content, regexRules, this.logger);

    // Combine and deduplicate entities
    const combined = [...nerEntities, ...regexEntities];

    // Give precedence to regex entities over overlapping NER entities
    const deduped = combined.filter((ent) =>
      // Regex entities take precedence over NER entities
      ent.type === 'regex'
        ? true
        : // check for intersecting ranges with regex entities
          !regexEntities.some((re) => ent.start_pos < re.end_pos && ent.end_pos > re.start_pos)
    );

    this.logger.debug(
      `Detected ${nerEntities.length} NER entities and ${regexEntities.length} regex entities, ${deduped.length} after deduplication`
    );

    return deduped;
  }

  /**
   * New user messages are anonymised (NER + regex) and their entities stored.
   * Assistant messages have any {hash} placeholders replaced with the original values.
   *
   * The function keeps a running `hashMap` built from all previously detected
   * entities so that assistant placeholders originating from earlier user
   * messages can be restored.
   *
   * If a message already has `detected_entities` it is skipped.
   *
   * @param messages - Messages to process for anonymization/deanonymization
   * @returns Object containing the processed messages
   */
  async processMessages(messages: Message[]): Promise<{ anonymizedMessages: Message[] }> {
    this.logger.debug(
      `Processing ${messages.length} messages for entity detection and deanonymization`
    );

    if (!this.rules.length) {
      return { anonymizedMessages: messages };
    }

    // Initialize hash map from existing entities
    const hashMap = buildDetectedEntitiesMap(messages);

    // Process each message and mutate in place
    for (const message of messages) {
      // Skip messages that already have entities detected
      if (message.message.detected_entities) {
        continue;
      }

      const { role, content } = message.message;

      // Process user messages - detect entities
      if (role === 'user' && content) {
        try {
          const entities = await this.detectEntities(content);
          message.message.detected_entities = entities.map((ent) => ({
            entity: ent.entity,
            class_name: ent.class_name,
            start_pos: ent.start_pos,
            end_pos: ent.end_pos,
            type: ent.type,
            hash: ent.hash,
          }));
          // Update hash map with newly detected entities
          entities.forEach((entity) => {
            hashMap.set(entity.hash, {
              value: entity.entity,
              class_name: entity.class_name,
              type: entity.type,
            });
          });
          continue;
        } catch (error) {
          this.logger.error(
            new Error('Entity detection failed for user message', { cause: error })
          );
          // Add the original message without entities detected (do nothing)
          continue;
        }
      }
      // Process assistant messages - replace hash placeholders
      else if (role === 'assistant') {
        this.processAssistantMessage(message, hashMap);
      }
    }

    return { anonymizedMessages: messages };
  }

  /**
   * Process an assistant message to replace hash placeholders
   *
   * Replaces hash placeholders in content and function arguments
   * with their original values using the provided hash map.
   *
   * @param message - Assistant message to process
   * @param hashMap - Map of hash values to entity information
   * @returns New message with hash placeholders replaced
   */
  private processAssistantMessage(
    message: Message,
    hashMap: Map<string, { value: string; class_name: string; type: DetectedEntityType }>
  ): void {
    const { content } = message.message;

    // Process content if it exists
    if (content) {
      const { unhashedText, detectedEntities } = deanonymizeText(content, hashMap);
      message.message.content = unhashedText;
      message.message.detected_entities = detectedEntities;
    }

    // Process function call arguments if they exist
    if (message.message.function_call?.arguments) {
      message.message.function_call.arguments = unhashString(
        message.message.function_call.arguments,
        hashMap
      );
    }

    // TODO: process other fields?
  }
}
