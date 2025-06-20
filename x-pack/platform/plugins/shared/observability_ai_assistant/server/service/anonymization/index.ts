/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { OperatorFunction, map } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import { ChatCompletionEvent, ChatCompletionEventType } from '@kbn/inference-common';
import { ChatCompletionUnredactedMessageEvent } from '@kbn/inference-common/src/chat_complete/events';
import { unhashString, redactEntities } from '../../../common/utils/anonymization/redaction';
import { detectRegexEntities } from './detect_regex_entities';
import { deanonymizeText } from './deanonymize_text';
import { getRedactableMessageEventParts } from './get_redactable_message_parts';
import {
  type DetectedEntity,
  DetectedEntityType,
  type Message,
  type AnonymizationRule,
  RegexAnonymizationRule,
  NerAnonymizationRule,
} from '../../../common/types';
import { detectNamedEntities } from './detect_named_entities';

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

  private async detectEntities(content: string): Promise<DetectedEntity[]> {
    // Skip detection if there's no content
    if (!content || !content.trim()) {
      return [];
    }

    this.logger.debug('Detecting entities in text content');

    // Filter rules by type
    const nerRules = this.rules.filter(
      (rule) => rule.type === 'ner' && rule.enabled
    ) as NerAnonymizationRule[];
    const regexRules = this.rules.filter(
      (rule) => rule.type === 'regex' && rule.enabled
    ) as RegexAnonymizationRule[];

    // Detect named entities
    const nerEntities = await detectNamedEntities(content, nerRules, this.logger, this.esClient);

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
