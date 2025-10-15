/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ModelProvider } from '@kbn/onechat-server';
import type { AgentMemoryProvider } from '@kbn/onechat-server/agents';
import type { BaseMessageLike } from '@langchain/core/messages';
import type { ConversationService } from '../conversation';
import { conversationToLangchainMessages } from '../agents/modes/utils';

const rewrittenQueriesSchema = z.object({
  main_intent_query: z
    .string()
    .describe(
      "A concise, self-contained query that captures the user's primary goal in the context of the recent conversation."
    ),
  hypothetical_questions: z
    .array(z.string())
    .describe('An array of questions that a relevant memory would likely answer.'),
  extracted_keywords: z
    .array(z.string())
    .describe('A list of key nouns, entities, and technical terms mentioned in the conversation.'),
});

const REWRITE_QUERY_SYSTEM_PROMPT = `You are an expert query understanding and rewriting AI. Your task is to analyze a conversation transcript and generate a set of precise, context-aware search queries.
These queries will be used to search a database of past conversation summaries to find relevant memories for an AI agent.

Based on the provided conversation history, generate a JSON object containing the main intent, hypothetical questions a relevant memory would answer, and extracted keywords.

--- EXAMPLE ---
CONVERSATION HISTORY:
user: "I need to analyze the user engagement data from last week. Can you write a Python script to pull it from the database?"
assistant: "Sure. Here is a script that connects to the 'prod-db-1' and fetches the data. [Code Block]"
user: "I ran it, but I'm getting a connection timeout error."

YOUR OUTPUT:
{
  "main_intent_query": "Troubleshooting a Python script that gets a connection timeout error when fetching user engagement data from a production database.",
  "hypothetical_questions": [
    "How to fix a database connection timeout in a Python script?",
    "What are common causes for database connection errors?",
    "Is there a previous conversation about connecting to 'prod-db-1'?"
  ],
  "extracted_keywords": [
    "Python",
    "connection timeout",
    "database",
    "prod-db-1",
    "user engagement"
  ]
}
--- END OF EXAMPLE ---
`;

export const createMemoryProvider = ({
  request,
  conversationsService,
  modelProvider,
}: {
  request: KibanaRequest;
  conversationsService: ConversationService;
  modelProvider: ModelProvider;
}): AgentMemoryProvider => {
  return {
    recall: async ({ message, previousRounds = [] }) => {
      return withActiveInferenceSpan(
        'GenerateRecallQuery',
        { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' } },
        () => {
          const model = await modelProvider.getDefaultModel();

          const conversationMessages = conversationToLangchainMessages({
            nextInput: {
              message,
            },
            previousRounds,
            ignoreSteps: true,
          });

          const messages: BaseMessageLike[] = [
            {
              role: 'system',
              content: REWRITE_QUERY_SYSTEM_PROMPT,
            },
            ...conversationMessages,
          ];

          const {
            main_intent_query: mainIntentQuery,
            extracted_keywords: extractedKeywords,
            hypothetical_questions: hypotheticalQuestions,
          } = await model.chatModel
            .withStructuredOutput(rewrittenQueriesSchema, { name: 'rewrite_query' })
            .invoke(messages);

          console.log(
            '**** query rewrite',
            mainIntentQuery,
            extractedKeywords,
            hypotheticalQuestions
          );

          const summaryService = await conversationsService.getSummarizationService({ request });

          // TODO: (not necessarily there) we need a way to exclude the current conversation from the search
          const results = await summaryService.search({
            term: mainIntentQuery,
            keywords: extractedKeywords,
            questions: hypotheticalQuestions,
          });

          // TODO: improve format
          return results.map((result) => {
            return { content: result.semantic_summary };
          });
        }
      );
    },
  };
};
