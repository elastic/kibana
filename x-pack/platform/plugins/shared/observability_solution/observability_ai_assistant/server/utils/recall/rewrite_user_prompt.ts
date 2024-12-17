/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { Logger } from '@kbn/logging';
import dedent from 'dedent';
import { lastValueFrom } from 'rxjs';
import { concatenateChatCompletionChunks, Message, MessageRole } from '../../../common';
import type { FunctionCallChatFunction } from '../../service/types';

const REWRITE_USER_PROMPT_FUNCTION_NAME = 'rewrite_user_prompt';

const rewriteUserPromptRequestRt = t.type({
  message: t.type({
    function_call: t.type({
      name: t.literal(REWRITE_USER_PROMPT_FUNCTION_NAME),
      arguments: t.string,
    }),
  }),
});

const scoreFunctionArgumentsRt = t.type({
  scores: t.string,
});

export async function rewriteUserPrompt({
  messages,
  userPrompt,
  context,
  chat,
  signal,
  logger,
}: {
  messages: Message[];
  userPrompt: string;
  context: string;
  chat: FunctionCallChatFunction;
  signal: AbortSignal;
  logger: Logger;
}): Promise<string> {
  const newUserMessage: Message = {
    '@timestamp': new Date().toISOString(),
    message: {
      role: MessageRole.User,
      content: dedent(
        `Given the following user prompt, the preceeding message history and context, rewrite the user prompt. 
        
        User prompt: ${userPrompt}`
      ),
    },
  };

  const rewriteUserPromptFunction = {
    strict: true,
    name: REWRITE_USER_PROMPT_FUNCTION_NAME,
    description: `Rewrites the user prompt into a concise search query and generates Elasticsearch boolean query filters based on user intent. Any mention of time or date range should be removed from the rewritten user prompt if added as a filter.

        ## Example        
        User prompt: "List all the bug reports that were opened for the front page this week?" 

        {
          "rewrittenUserPrompt": "front page bugs"
          "elasticsearchFilters": [
            { term: { type: "issue" } },
            {
              range: {
                created_at: {
                  gte: "now-7d/d",
                  lte: "now/d",
                },
              },
            },
          ],
        }

      `,
    parameters: {
      type: 'object',
      properties: {
        rewrittenUserPrompt: {
          type: 'string',
          description:
            "A single sentence that captures the core of the user's intent for semantic search.",
        },
        elasticsearchFilters: {
          type: 'array',
          description: 'A list of Elasticsearch filters that refine the search results.',
          items: {
            type: 'object',
            description: 'An Elasticsearch filter object.',
            properties: {
              term: {
                type: 'object',
                description: 'A term filter for exact matching fields.',
                properties: {
                  field: {
                    type: 'string',
                    description: 'The name of the keyword field',
                  },
                  value: {
                    type: 'string',
                    description: 'The value to filter the field by.',
                  },
                },
                required: ['field', 'value'],
              },
              range: {
                type: 'object',
                description: 'A range filter to specify a date range.',
                properties: {
                  field: {
                    type: 'string',
                    description: 'The name of the date field',
                  },
                  gte: {
                    type: 'string',
                    description:
                      "The greater-than-or-equal value (e.g., a date string like 'now-7d/d').",
                  },
                  lte: {
                    type: 'string',
                    description: "The less-than-or-equal value (e.g., a date string like 'now/d').",
                  },
                },
                required: ['field', 'gte', 'lte'],
              },
            },
          },
        },
      },
      required: ['rewrittenUserPrompt', 'elasticsearchFilters'],
    } as const,
  };

  const response = await lastValueFrom(
    chat(`function call: ${REWRITE_USER_PROMPT_FUNCTION_NAME}`, {
      messages: [...messages.slice(0, -2), newUserMessage],
      functions: [rewriteUserPromptFunction],
      functionCall: REWRITE_USER_PROMPT_FUNCTION_NAME,
      signal,
    }).pipe(concatenateChatCompletionChunks())
  );

  console.log(JSON.stringify(response, null, 2));

  // const validatedResponse = decodeOrThrow(rewriteUserPromptRequestRt)(response);
  // const validatedJson = decodeOrThrow(jsonRt.pipe(scoreFunctionArgumentsRt))(
  //   validatedResponse.message.function_call.arguments
  // );

  // return scoresAsString;
}
