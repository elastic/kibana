/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { lastValueFrom } from 'rxjs';
import dedent from 'dedent';
import { Message } from '../../../../common';
import { FunctionCallChatFunction } from '../../../service/types';

export async function getRewrittenUserPrompt({
  userPrompt,
  screenDescription,
  chat,
  messages,
  logger,
  signal,
}: {
  userPrompt: string;
  screenDescription: string;
  chat: FunctionCallChatFunction;
  messages: Message[];
  logger: Logger;
  signal: AbortSignal;
}): Promise<string> {
  try {
    const systemMessage = dedent(`
      You are a Retrieval Assistant
      Your sole task is to rewrite the provided user prompt into ONE self-contained query that will be embedded and sent to Elasticsearch to retrieve semantically similar documents.
      The user is a human using the Elastic Stack (Kibana and Elasticsearch) to analyze their data.

      Screen description. This provides context about what the user is looking at, which may help you in rewriting the user prompt:
      <ScreenDescription>
      ${screenDescription}
      </ScreenDescription>

      <UserPrompt>
      ${userPrompt}
      </UserPrompt>

      Criteria:
      - Output must be concise and maximally 50 tokens.
      - Output must be plain text, no markdown or formatting.
      - Expand vague prompts by adding clarifying context, but do not add any new information.
      - Avoid hallucinating data or exact numbers not present in the original query.
      - Pay special attention to the user prompt but consider the entire conversation history.
      - You must only output the rewritten question. Nothing else`);

    const chatResponse = await lastValueFrom(
      chat('rewrite_user_prompt', {
        stream: true,
        signal,
        systemMessage,
        messages,
      })
    );

    const rewrittenUserPrompt = chatResponse.message?.content ?? '';

    logger.debug(`The user prompt "${userPrompt}" was re-written to "${rewrittenUserPrompt}"`);

    return rewrittenUserPrompt;
  } catch (error) {
    logger.error(`Failed to rewrite the user prompt: "${userPrompt}"`);
    logger.error(error);
    return '';
  }
}
