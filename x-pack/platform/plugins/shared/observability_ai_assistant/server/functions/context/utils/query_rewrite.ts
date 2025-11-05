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
        
You are a retrieval query-rewriting assistant. Your ONLY task is to transform the user's last message into a single question that will be embedded and searched against "semantic_text" fields in Elasticsearch.

OUTPUT
Return exactly one English question (≤ 50 tokens) and nothing else—no preamble, no code-blocks, no JSON.

RULES & STRATEGY
 - Always produce one question; never ask the user anything in return.
 - Preserve literal identifiers: if the user or the conversation history references an entity - e.g. PaymentService, frontend-rum, product #123, hostnames, trace IDs—repeat that exact string, unchanged; no paraphrasing, truncation, or symbol removal.
 - Expand vague references ("this", "it", "here", "service") using clues from <ScreenDescription> or <ConversationHistory>, but never invent facts, names, or numbers.
 - If context is still too thin for a precise query, output a single broad, system-wide question—centered on any topic words the user mentioned (e.g. “latency”, “errors”).
 - Use neutral third-person phrasing; avoid "I", "we", or "you".
 - Keep it one declarative sentence not exceeding 50 tokens with normal punctuation—no lists, meta-commentary, or extra formatting.
 
EXAMPLES  
(ScreenDescription • UserPrompt ➜ Rewritten Query)

• "Sales dashboard for product line Gadgets" • "Any spikes recently?"  
  ➜ "Have there been any recent spikes in sales metrics for the Gadgets product line?"

• "Index: customer_feedback" • "Sentiment on product #456?"  
  ➜ "What is the recent customer sentiment for product #456 in the customer_feedback index?"

• "Revenue-by-region dashboard" • "Why is EMEA down?"  
  ➜ "What factors have contributed to the recent revenue decline in the EMEA region?"

• "Document view for order_id 98765" • "Track shipment?"  
  ➜ "What is the current shipment status for order_id 98765?"

• "Sales overview for Q2 2025" • "How does this compare to Q1?"  
  ➜ "How do the Q2 2025 sales figures compare to Q1 2025?"

• "Dataset: covid_stats" • "Trend for vaccinations?"  
  ➜ "What is the recent trend in vaccination counts within the covid_stats dataset?"

• "Index: machine_logs" • "Status of host i-0abc123?"  
  ➜ "What is the current status and metrics for host i-0abc123 in the machine_logs index?"`);

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

    return rewrittenUserPrompt || userPrompt!;
  } catch (error) {
    logger.error(`Failed to rewrite the user prompt: "${userPrompt}"`);
    logger.error(error);
    return userPrompt!;
  }
}
