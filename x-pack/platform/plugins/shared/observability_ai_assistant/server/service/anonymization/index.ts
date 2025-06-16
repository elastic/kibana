/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withInferenceSpan } from '@kbn/inference-tracing';
import { ElasticsearchClient } from '@kbn/core/server';
import pLimit from 'p-limit';
import { OperatorFunction, map } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import { chunk } from 'lodash';
import { ChatCompletionEvent, ChatCompletionEventType } from '@kbn/inference-common';
import { ChatCompletionUnredactedMessageEvent } from '@kbn/inference-common/src/chat_complete/events';
import { unhashString, redactEntities } from '../../../common/utils/anonymization/redaction';
import { detectRegexEntities } from './detect_regex_entities';
import { deanonymizeText } from './deanonymize_text';
import { chunkText } from './chunk_text';
import { getRedactableMessageEventParts } from './get_redactable_message_parts';
import {
  type DetectedEntity,
  DetectedEntityType,
  type InferenceChunk,
  type Message,
  type AnonymizationRule,
} from '../../../common/types';
import { getEntityHash } from './get_entity_hash';

const NER_MODEL_ID = 'elastic__distilbert-base-uncased-finetuned-conll03-english';
const DEFAULT_MAX_CONCURRENT_REQUESTS = 5;
export interface Dependencies {
  esClient: {
    asCurrentUser: ElasticsearchClient;
  };
  logger: Logger;
  anonymizationRules: AnonymizationRule[];
}

export class AnonymizationService {
  private readonly esClient: { asCurrentUser: ElasticsearchClient };
  private readonly logger: Logger;
  private rules: AnonymizationRule[];

  private currentHashMap: Map<
    string,
    { value: string; class_name: string; type: DetectedEntityType }
  > = new Map();

  constructor({ esClient, logger, anonymizationRules }: Dependencies) {
    this.esClient = esClient;
    this.logger = logger;
    this.rules = anonymizationRules;
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
            throw new Error('NER inference failed', { cause: error });
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
   * Redacts all user messages by replacing detected entities with {hash} placeholders
   */
  async redactMessages(messages: Message[]): Promise<{ redactedMessages: Message[] }> {
    if (!this.rules.length) {
      return { redactedMessages: messages };
    }

    for (const msg of messages) {
      // we may want to ignore assistant responses in the future
      if (!msg.message.content) {
        continue;
      }

      const entities = await this.detectEntities(msg.message.content);

      if (entities.length) {
        msg.message.content = redactEntities(msg.message.content, entities);

        // Update hashMap
        entities.forEach((e) => {
          this.currentHashMap.set(e.hash, {
            value: e.entity,
            class_name: e.class_name,
            type: e.type,
          });
        });
      }
    }

    // Redact entity values inside any function_call.arguments JSON strings
    for (const msg of messages) {
      const argsStr = msg.message.function_call?.arguments;
      if (!argsStr) continue;

      let redactedArgs = argsStr;
      // Replace every known entity value with its hash
      this.currentHashMap.forEach((info, hash) => {
        redactedArgs = redactedArgs.split(info.value).join(hash);
      });
      msg.message.function_call!.arguments = redactedArgs;
    }
    return { redactedMessages: messages };
  }

  /**
   * Restores all {hash} placeholders in-place and attaches `unredactions` array
   * for UI highlighting (content only).
   */
  unredactMessages(messages: Message[]): { unredactedMessages: Message[] } {
    for (const msg of messages) {
      const content = msg.message.content;
      if (content) {
        const { unhashedText, detectedEntities } = deanonymizeText(content, this.currentHashMap);

        msg.message.content = unhashedText;
        if (detectedEntities.length > 0) {
          msg.message.unredactions = detectedEntities.map(({ hash, ...rest }) => rest);
        }
      }

      // also unhash function_call.arguments if present
      if (msg.message.function_call?.arguments) {
        msg.message.function_call.arguments = unhashString(
          msg.message.function_call.arguments,
          this.currentHashMap
        );
      }
    }
    return { unredactedMessages: messages };
  }
  unredactChatCompletionEvent(): OperatorFunction<
    ChatCompletionEvent,
    ChatCompletionEvent | ChatCompletionUnredactedMessageEvent
  > {
    return (source$) => {
      return source$.pipe(
        map((event): ChatCompletionEvent | ChatCompletionUnredactedMessageEvent => {
          if (event.type === ChatCompletionEventType.ChatCompletionMessage) {
            const redacted = getRedactableMessageEventParts(event);
            const contentUnredaction =
              'content' in redacted && redacted.content && typeof redacted.content === 'string'
                ? deanonymizeText(redacted.content, this.currentHashMap)
                : undefined;
            const unredaction = deanonymizeText(JSON.stringify(redacted), this.currentHashMap);
            const unredactedObj = JSON.parse(unredaction.unhashedText);

            // Ensure tool call arguments are always strings, even if they're objects in the JSON
            if (unredactedObj.toolCalls) {
              unredactedObj.toolCalls = unredactedObj.toolCalls.map(
                (toolCall: {
                  function?: {
                    name?: string;
                    arguments?: any;
                  };
                }) => {
                  if (toolCall.function && typeof toolCall.function.arguments === 'object') {
                    // Convert object arguments to strings to maintain compatibility in redactMessages and unredactMessages
                    return {
                      ...toolCall,
                      function: {
                        ...toolCall.function,
                        arguments: JSON.stringify(toolCall.function.arguments),
                      },
                    };
                  }
                  return toolCall;
                }
              );
            }

            const redactedEvent: ChatCompletionUnredactedMessageEvent = {
              ...event,
              ...unredactedObj,
            };
            if (contentUnredaction && contentUnredaction.detectedEntities.length > 0) {
              redactedEvent.unredactions = contentUnredaction.detectedEntities;
              // TODO: not being passed through due to concatenateChatCompletionChunks filtering out non chunk events
              // causing knowledge base entities to be stored with redactions
              // and having to call undreactMessages outside chat
            }
            return redactedEvent;
          }
          return event;
        })
      );
    };
  }
}
