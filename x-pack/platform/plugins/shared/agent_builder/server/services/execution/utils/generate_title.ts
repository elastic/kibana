/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { defer, shareReplay } from 'rxjs';
import { z } from '@kbn/zod/v4';
import type { BaseMessageLike } from '@langchain/core/messages';
import type { Logger } from '@kbn/logging';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import type { Conversation, ConversationRound, ConverseInput } from '@kbn/agent-builder-common';
import { createUserMessage } from '@kbn/agent-builder-genai-utils/langchain';

/**
 * Generates a title for a conversation
 */
export const generateTitle = ({
  nextInput,
  conversation,
  chatModel,
  anonymizationEnabled,
  deanonymizeTitle,
  abortSignal,
  logger,
}: {
  nextInput: ConverseInput;
  conversation: Conversation;
  chatModel: InferenceChatModel;
  anonymizationEnabled: boolean;
  deanonymizeTitle?: (title: string) => Promise<string>;
  abortSignal?: AbortSignal;
  logger: Logger;
}): Observable<string> => {
  return defer(async () => {
    try {
      return await generateConversationTitle({
        previousRounds: conversation.rounds,
        nextInput,
        chatModel,
        replacementsId: anonymizationEnabled ? conversation.replacementsId : undefined,
        deanonymizeTitle,
        abortSignal,
      });
    } catch (e) {
      logger.warn(
        `[agent_builder.generateTitle] Failed to generate title, falling back to default: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      return conversation.title;
    }
  }).pipe(shareReplay());
};

const generateConversationTitle = async ({
  previousRounds,
  nextInput,
  chatModel,
  replacementsId,
  deanonymizeTitle,
  abortSignal,
}: {
  previousRounds: ConversationRound[];
  nextInput: ConverseInput;
  chatModel: InferenceChatModel;
  replacementsId?: string;
  deanonymizeTitle?: (title: string) => Promise<string>;
  abortSignal?: AbortSignal;
}) => {
  return withActiveInferenceSpan(
    'GenerateTitle',
    { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' } },
    async (span) => {
      const modelForRequest = replacementsId
        ? chatModel.withAnonymization({ replacementsId })
        : chatModel;

      const structuredModel = modelForRequest.withStructuredOutput(
        z
          .object({
            title: z.string().describe('The title for the conversation'),
          })
          .describe('Tool to use to provide the title for the conversation'),
        { name: 'set_title' }
      );

      const prompt: BaseMessageLike[] = [
        [
          'system',
          `You are a title-generation utility. Your ONLY purpose is to create a short, relevant title for the provided conversation.

You MUST call the 'set_title' tool to provide the title. Do NOT respond with plain text or any other conversational language.

Here is an example:
Conversation:
- User: "Hey, can you help me find out how to configure a new role in Kibana for read-only access to dashboards?"
- Assistant: "Of course! To create a read-only role..."
=> Your response MUST be a call to the 'set_title' tool like this: {"title": "Kibana Read-Only Role Configuration"}

Now, generate a title for the following conversation.`,
        ],
        createUserMessage(nextInput.message ?? '[no message]'),
      ];

      const { title } = await structuredModel.invoke(prompt, { signal: abortSignal });

      const resolvedTitle = deanonymizeTitle ? await deanonymizeTitle(title) : title;

      span?.setAttribute('output.value', resolvedTitle);

      return resolvedTitle;
    }
  );
};
