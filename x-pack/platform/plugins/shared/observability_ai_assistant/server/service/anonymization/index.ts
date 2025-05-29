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
import { ObservabilityAIAssistantConfig } from '../../config';

const NER_MODEL_ID = 'elastic__distilbert-base-uncased-finetuned-conll03-english';
const DEFAULT_MAX_CONCURRENT_REQUESTS = 5;

export interface Dependencies {
  esClient: {
    asCurrentUser: ElasticsearchClient;
  };
  config: ObservabilityAIAssistantConfig;
  logger: Logger;
}

export class AnonymizationService {
  private readonly esClient: { asCurrentUser: ElasticsearchClient };
  private readonly config: ObservabilityAIAssistantConfig;
  private readonly logger: Logger;

  constructor({ esClient, config, logger }: Dependencies) {
    this.esClient = esClient;
    this.config = config;
    this.logger = logger;
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

    // temporary setting to remove once advanced setting is implemented
    // where user opts-in to anonymization built in rules
    if (!this.config.enableAnonymization) {
      return { anonymizedMessages: messages };
    }

    // Initialize hash map from existing entities
    const hashMap = buildDetectedEntitiesMap(messages);

    // Process each message and collect results
    const result: Message[] = [];

    for (const message of messages) {
      // Skip messages that already have entities detected
      if (message.message.detected_entities) {
        result.push(message);
        continue;
      }

      const { role, content } = message.message;

      // Process user messages - detect entities
      if (role === 'user' && content) {
        try {
          const { processedMessage, entities } = await this.processUserMessage(message);

          // Update hash map with newly detected entities
          entities.forEach((entity) => {
            hashMap.set(entity.hash, {
              value: entity.entity,
              class_name: entity.class_name,
              type: entity.type,
            });
          });

          result.push(processedMessage);
        } catch (error) {
          this.logger.error(
            `Failed to process user message: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          // Add the original message without entities detected
          result.push(message);
        }
      }
      // Process assistant messages - replace hash placeholders
      else if (role === 'assistant') {
        result.push(this.processAssistantMessage(message, hashMap));
      } else {
        result.push(message);
      }
    }

    return { anonymizedMessages: result };
  }

  /**
   * Process a user message to detect entities
   *
   * Identifies entities using NER and regex patterns and returns
   * a new message with the detected entities attached.
   *
   * @param message - User message to process
   * @returns Object containing processed message and detected entities
   */
  private async processUserMessage(
    message: Message
  ): Promise<{ processedMessage: Message; entities: DetectedEntity[] }> {
    const { content } = message.message;

    // Handle case with no content
    if (!content) {
      return {
        processedMessage: message,
        entities: [],
      };
    }

    // Detect entities using NER and regex
    const chunks = chunkText(content);
    const nerEntities = await this.detectNamedEntities(chunks);
    const regexEntities = detectRegexEntities(content);

    // Combine and deduplicate entities
    const combined = [...nerEntities, ...regexEntities];
    const deduped = combined.filter((ent) =>
      // Regex entities take precedence over NER entities
      ent.type === 'regex'
        ? true
        : // check for intersecting ranges
          !regexEntities.some((re) => ent.start_pos < re.end_pos && ent.end_pos > re.start_pos)
    );

    // Create entity objects to attach to the message
    const detectedEntities = deduped.map((ent) => ({
      entity: ent.entity,
      class_name: ent.class_name,
      start_pos: ent.start_pos,
      end_pos: ent.end_pos,
      type: ent.type,
      hash: ent.hash,
    }));

    // Create a new message with detected entities
    const processedMessage = {
      ...message,
      message: {
        ...message.message,
        ...(detectedEntities.length > 0 && { detected_entities: detectedEntities }),
      },
    };

    return {
      processedMessage,
      entities: deduped,
    };
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
  ): Message {
    const { content } = message.message;

    // Create a new message object to avoid mutations
    const processedMessage = {
      ...message,
      message: {
        ...message.message,
      },
    };

    // Process content if it exists
    if (content) {
      const { unhashedText, detectedEntities } = deanonymizeText(content, hashMap);
      processedMessage.message.content = unhashedText;
      processedMessage.message.detected_entities = detectedEntities;
    }

    // Process function call arguments if they exist
    if (processedMessage.message.function_call?.arguments) {
      processedMessage.message.function_call = {
        ...processedMessage.message.function_call,
        arguments: unhashString(processedMessage.message.function_call.arguments, hashMap),
      };
    }

    // TODO: process other fields?

    return processedMessage;
  }
}
