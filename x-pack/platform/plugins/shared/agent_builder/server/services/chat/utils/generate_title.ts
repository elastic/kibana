/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { defer, shareReplay } from 'rxjs';
import { z } from '@kbn/zod';
import type { BaseMessageLike } from '@langchain/core/messages';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import type { Conversation, ConversationRound, ConverseInput } from '@kbn/agent-builder-common';
import { createUserMessage } from '@kbn/agent-builder-genai-utils/langchain';
import type { ModelCallContext } from '../../runner/model_provider';

export interface GenerateTitleParams {
  nextInput: ConverseInput;
  conversation: Conversation;
  chatModel: InferenceChatModel;
  modelCallContext?: Pick<
    ModelCallContext,
    'agentId' | 'conversationId' | 'request' | 'connectorId' | 'abortSignal'
  >;
}

/**
 * Generates a title for a conversation
 */
export const generateTitle = ({
  nextInput,
  conversation,
  chatModel,
  modelCallContext,
}: GenerateTitleParams): Observable<string> => {
  return defer(async () => {
    return generateConversationTitle({
      previousRounds: conversation.rounds,
      nextInput,
      chatModel,
      modelCallContext,
    });
  }).pipe(shareReplay());
};

const TITLE_SYSTEM_PROMPT = `You are a title-generation utility. Your ONLY purpose is to create a short, relevant title for the provided conversation.

You MUST call the 'set_title' tool to provide the title. Do NOT respond with plain text or any other conversational language.

Here is an example:
Conversation:
- User: "Hey, can you help me find out how to configure a new role in Kibana for read-only access to dashboards?"
- Assistant: "Of course! To create a read-only role..."
=> Your response MUST be a call to the 'set_title' tool like this: {"title": "Kibana Read-Only Role Configuration"}

Now, generate a title for the following conversation.`;

const generateConversationTitle = async ({
  previousRounds,
  nextInput,
  chatModel,
  modelCallContext,
}: {
  previousRounds: ConversationRound[];
  nextInput: ConverseInput;
  chatModel: InferenceChatModel;
  modelCallContext?: Pick<
    ModelCallContext,
    'agentId' | 'conversationId' | 'request' | 'connectorId' | 'abortSignal'
  >;
}) => {
  return withActiveInferenceSpan(
    'GenerateTitle',
    { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' } },
    async (span) => {
      const structuredModel = chatModel.withStructuredOutput(
        z
          .object({
            title: z.string().describe('The title for the conversation'),
          })
          .describe('Tool to use to provide the title for the conversation'),
        { name: 'set_title' }
      );

      const prompt: BaseMessageLike[] = [
        ['system', TITLE_SYSTEM_PROMPT],
        createUserMessage(nextInput.message ?? '[no message]'),
      ];

      const invokeWithMessages = (messages: BaseMessageLike[], signal?: AbortSignal) =>
        structuredModel.invoke(messages, signal ? { signal } : undefined);

      const result = await invokeWithMessages(prompt, modelCallContext?.abortSignal);

      const title =
        typeof result === 'object' && result !== null && 'title' in result
          ? (result as { title: string }).title
          : '';

      span?.setAttribute('output.value', title);

      return title;
    }
  );
};
