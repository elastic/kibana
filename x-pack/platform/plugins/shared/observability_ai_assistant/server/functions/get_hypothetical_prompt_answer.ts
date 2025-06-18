/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { lastValueFrom } from 'rxjs';
import { Message, MessageRole } from '../../common';
import { FunctionCallChatFunction } from '../service/types';

export async function getHypotheticalPromptAnswer({
  userPrompt,
  chat,
  messages,
  logger,
  signal,
}: {
  userPrompt: string;
  chat: FunctionCallChatFunction;
  messages: Message[];
  logger: Logger;
  signal: AbortSignal;
}): Promise<string> {
  try {
    logger.debug(`Generating hypothetical answer for user prompt: "${userPrompt}"`);

    const response$ = chat('retrieve_hypothetical_answer', {
      stream: true,
      signal,
      systemMessage: `
You are an Observability Retrieval Assistant.  
Your sole task is to produce ONE short, plausible answer (≤ 50 tokens, plain text) to the user's question so that it can be used to retrieve semantically similar documents in Elasticsearch.
Rules:
 - Output exactly one paragraph and nothing else.
 - Do not mention you are guessing, do not apologise, do not add explanations, follow-up questions, markdown, labels, or tool references.
 - Use relevant domain terms.
 - Express numerals approximately (e.g., “a few seconds”, “about 15 %”) unless the user supplies exact values.  
 - If uncertain, infer a reasonable answer consistent with the conversation.`,
      messages: [
        ...messages,
        {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.User,
            content: `Write a single-paragraph answer (≈ 50 tokens) to the following query.  
Return only the answer text - no preamble, no comments:

"${userPrompt}"`,
          },
        },
      ],
    });

    const chatEvent = await lastValueFrom(response$);
    const hypotheticalPromptAnswer = chatEvent.message?.content ?? '';

    logger.debug(`Generated hypothetical prompt answer: "${hypotheticalPromptAnswer}"`);

    return hypotheticalPromptAnswer;
  } catch (error) {
    logger.error(`Failed to generate hypothetical answer for user prompt: "${userPrompt}"`);
    logger.error(error);
    return '';
  }
}
