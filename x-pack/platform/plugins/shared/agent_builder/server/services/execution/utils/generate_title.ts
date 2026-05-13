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
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import type { Conversation, ConversationRound, ConverseInput } from '@kbn/agent-builder-common';
import { createUserMessage } from '@kbn/agent-builder-genai-utils/langchain';
import { trace } from '@opentelemetry/api';
import type { Context } from '@opentelemetry/api';
import { getExecutionOtelContext } from '../../../tracing';

/**
 * Generates a title for a conversation
 */
export const generateTitle = ({
  nextInput,
  conversation,
  chatModel,
  executionId,
}: {
  nextInput: ConverseInput;
  conversation: Conversation;
  chatModel: InferenceChatModel;
  executionId?: string;
}): Observable<string> => {
  return defer(async () => {
    try {
      return await generateConversationTitle({
        previousRounds: conversation.rounds,
        nextInput,
        chatModel,
        executionId,
      });
    } catch (e) {
      return conversation.title;
    }
  }).pipe(shareReplay());
};

const generateConversationTitle = async ({
  previousRounds,
  nextInput,
  chatModel,
  executionId,
}: {
  previousRounds: ConversationRound[];
  nextInput: ConverseInput;
  chatModel: InferenceChatModel;
  executionId?: string;
}) => {
  const parentCtx = executionId ? getExecutionOtelContext(executionId) : undefined;
  const spanArgs = [
    'GenerateTitle',
    { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' } },
  ] as const;

  const spanCb = async (span?: import('@opentelemetry/api').Span) => {
    // Build a context that includes the GenerateTitle span so the
    // chatModel's ChatComplete span becomes a child of GenerateTitle.
    let titleCtx: Context | undefined;
    if (span && parentCtx) {
      titleCtx = trace.setSpan(parentCtx, span);
    }

    const scopedModel = titleCtx ? chatModel.withParentContext(() => titleCtx) : chatModel;

    const structuredModel = scopedModel.withStructuredOutput(
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

    const { title } = await structuredModel.invoke(prompt);

    span?.setAttribute('output.value', title);

    return title;
  };

  return parentCtx
    ? withActiveInferenceSpan(spanArgs[0], spanArgs[1], parentCtx, spanCb)
    : withActiveInferenceSpan(spanArgs[0], spanArgs[1], spanCb);
};
