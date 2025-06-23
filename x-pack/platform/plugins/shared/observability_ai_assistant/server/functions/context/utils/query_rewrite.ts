/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { lastValueFrom } from 'rxjs';
import dedent from 'dedent';
import { Message, MessageRole } from '../../../../common';
import { FunctionCallChatFunction } from '../../../service/types';
import { getLastUserMessage } from './get_last_user_message';

export async function queryRewrite({
  screenDescription,
  chat,
  messages,
  logger,
  signal,
}: {
  screenDescription: string;
  chat: FunctionCallChatFunction;
  messages: Message[];
  logger: Logger;
  signal: AbortSignal;
}): Promise<string> {
  const userPrompt = getLastUserMessage(messages);

  try {
    const systemMessage = dedent(`
<ConversationHistory>
${JSON.stringify(messages, null, 2)}
</ConversationHistory>

<ScreenDescription>
${screenDescription ? screenDescription : 'No screen context provided.'}
</ScreenDescription>        
        
You are a retrieval query-rewriting assistant. Your ONLY task is to transform the user's last message (<UserPrompt>) into a single question that will be embedded and searched against "semantic_text" fields in Elasticsearch.

OUTPUT  
Return **exactly one** natural-language question (≤ 50 tokens) and nothing else. End the response immediately after the question - no preamble, no code fences, no JSON.

RULES & STRATEGY  
- Produce a query every time; **never** ask the user follow-up questions.  
- Expand vague references ("this", "it", "here", "service") using clues from <ScreenDescription> or earlier user turns, but **never invent** facts, names, or numbers.  
- When a concrete service/entity name is present, prefer that exact name.
- If context is still too thin for a precise query, output a broad, system-wide question.  
- If the user's words mention a topic (e.g., "latency", "errors"), center the broad question on that topic.
- Use neutral third-person phrasing; avoid "I", "we", or "you".  
- Keep the query one sentence, declarative, with normal punctuation - no lists, no meta-commentary, no extra formatting."`);

    const chatResponse = await lastValueFrom(
      chat('rewrite_user_prompt', {
        stream: true,
        signal,
        systemMessage,
        messages: [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: userPrompt,
            },
          },
        ],
      })
    );

    const rewrittenUserPrompt = chatResponse.message?.content ?? '';

    logger.debug(`The user prompt "${userPrompt}" was re-written to "${rewrittenUserPrompt}"`);

    return rewrittenUserPrompt;
  } catch (error) {
    logger.error(`Failed to rewrite the user prompt: "${userPrompt}"`);
    logger.error(error);
    return userPrompt!;
  }
}
