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

export async function getRewrittenUserPrompt({
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
    const response$ = chat('rewrite_user_prompt', {
      stream: true,
      signal,
      systemMessage: `
You are a Retrieval Assistant
Your sole task is to rewrite the provided user prompt into ONE self-contained query that will be embedded and sent to Elasticsearch to retrieve semantically similar documents.
Your domain of expertise is Site Reliability Engineering (SRE), Observability and the Elastic Stack.

Rules
- Output exactly one question. Nothing else.
- Output must be concise and maximally 50 tokens.
- Output must be plain text, no markdown or formatting.
- Expand shorthand or vague phrases with common observability terms.
- Add clarifying context and helpful synonyms
- Avoid hallucinating data or exact numbers not present in the original query.
- If information is missing, infer likely context
- Output only the rewritten question.`,
      messages: [
        ...messages,
        {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.User,
            content: userPrompt,
          },
        },
      ],
    });

    const chatEvent = await lastValueFrom(response$);
    const rewrittenUserPrompt = chatEvent.message?.content ?? '';

    logger.debug(`The user prompt "${userPrompt}" was re-written to "${rewrittenUserPrompt}"`);

    return rewrittenUserPrompt;
  } catch (error) {
    logger.error(`Failed to rewrite the user prompt: "${userPrompt}"`);
    logger.error(error);
    return '';
  }
}
