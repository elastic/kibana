/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import dedent from 'dedent';
import { lastValueFrom } from 'rxjs';
import { concatenateChatCompletionChunks, Message, MessageRole } from '../../../common';
import type { FunctionCallChatFunction } from '../../service/types';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { getConnectorIndices } from '../../service/knowledge_base_service/recall_from_search_connectors';
import { IUiSettingsClient } from '@kbn/core-ui-settings-server';

const REWRITE_USER_PROMPT_FUNCTION_NAME = 'rewrite_user_prompt';

export async function rewriteUserPrompt({
  esClient,
  uiSettingsClient,
  messages,
  userPrompt,
  context,
  chat,
  signal,
  logger,
}: {
  esClient: IScopedClusterClient;
  uiSettingsClient: IUiSettingsClient;
  messages: Message[];
  userPrompt: string;
  context: string;
  chat: FunctionCallChatFunction;
  signal: AbortSignal;
  logger: Logger;
}): Promise<{
  rewrittenUserPrompt: string;
  keywordFilters?: Array<{ field: string; value: string }>;
  timestampFilter?: { field: string; gte: string; lte: string };
}> {
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

  const connectorIndices = await getConnectorIndices({ esClient, uiSettingsClient, logger });
  const timestampFields = await getTimestampFields(esClient, connectorIndices);
  const lowCardinalityKeywordFields = await getLowCardinalityKeywordFields(
    esClient,
    connectorIndices
  );
  const keywordFieldSchema = lowCardinalityKeywordFields.map(({ field, values }) => ({
    properties: {
      field: { const: field },
      value: { enum: values },
    },
    required: ['field', 'value'],
  }));

  // const keywordFieldSchema = [
  //   {
  //     properties: {
  //       field: { const: 'serviceName' },
  //       value: { enum: ['frontend', 'backend', 'api'] },
  //     },
  //     required: ['field', 'value'],
  //   },
  //   {
  //     properties: {
  //       field: { const: 'environment' },
  //       value: { enum: ['production', 'staging', 'development'] },
  //     },
  //     required: ['field', 'value'],
  //   },
  // ];

  const rewriteUserPromptFunction = {
    strict: true,
    name: REWRITE_USER_PROMPT_FUNCTION_NAME,
    description: `Rewrites the user prompt into a concise search query and generates Elasticsearch boolean query filters based on user intent. Any mention of time or date range should be removed from the rewritten user prompt if added as a filter.

          ## Example        
          User prompt: "List all the bug reports that were opened for the front page this week?" 

          {
            "rewrittenUserPrompt": "front page bugs",
            "keywordFilters": [
              { "term": { "type": "issue" } }
            ],
            "timestampFilter": {
              "range": {
                "created_at": {
                  "gte": "now-7d/d",
                  "lte": "now/d",
                },
              },
            },
          }
        `,
    parameters: {
      type: 'object',
      properties: {
        rewrittenUserPrompt: {
          type: 'string',
          description:
            "A single sentence that captures the core of the user's intent. The rewritten user prompt will be used as a semantic search query.",
        },
        ...(keywordFieldSchema.length > 0
          ? {
              keywordFilters: {
                type: 'array',
                description:
                  'A list of Elasticsearch filters for exactly matching keyword fields. The filters are used to narrow down the search results based on user intent.',
                items: {
                  type: 'object',
                  description:
                    'A filter object for a named keyword field, filtered by a specific value.',
                  oneOf: keywordFieldSchema,
                },
              } as const,
            }
          : {}),
        ...(timestampFields.length > 0
          ? {
              timestampFilter: {
                type: 'object',
                description: 'A range filter to specify a date range.',
                properties: {
                  field: {
                    type: 'string',
                    description: 'The name of the date field',
                    enum: timestampFields,
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
              } as const,
            }
          : {}),
      },
      required: ['rewrittenUserPrompt'],
    } as const,
  };

  console.log('schema', JSON.stringify(rewriteUserPromptFunction, null, 2));

  const response = await lastValueFrom(
    chat(`function call: ${REWRITE_USER_PROMPT_FUNCTION_NAME}`, {
      messages: [...messages.slice(0, -2), newUserMessage],
      functions: [rewriteUserPromptFunction],
      functionCall: REWRITE_USER_PROMPT_FUNCTION_NAME,
      signal,
    }).pipe(concatenateChatCompletionChunks())
  );

  console.log('response', JSON.stringify(response, null, 2));

  return JSON.parse(response.message.function_call.arguments);
}

async function getLowCardinalityKeywordFields(
  esClient: IScopedClusterClient,
  connectorIndices: string[]
): Promise<Array<{ field: string; values: string[] }>> {
  try {
    // Step 1: Get all keyword fields using field_caps
    const fieldCapsResponse = await esClient.asCurrentUser.fieldCaps({
      index: connectorIndices,
      fields: '*',
      types: ['keyword'],
      allow_no_indices: true,
      filters: '-nested,-metadata,-parent',
    });

    // Step 2: For each keyword field, get its unique values using _terms_enum
    const keywordItems = await Promise.all(
      Object.keys(fieldCapsResponse.fields).map(async (field) => {
        const termsEnumResponse = await esClient.asCurrentUser.termsEnum({
          index: connectorIndices.join(','),
          field: field,
          size: 10,
        });

        return { field, values: termsEnumResponse.terms };
      })
    );

    // Step 3: Return the low-cardinality fields
    return keywordItems.filter(({ values }) => values.length < 10);
  } catch (error) {
    console.error('Error retrieving low-cardinality fields:', error);
    return [];
  }
}

async function getTimestampFields(
  esClient: IScopedClusterClient,
  connectorIndices: string[]
): Promise<string[]> {
  try {
    const fieldCapsResponse = await esClient.asCurrentUser.fieldCaps({
      index: connectorIndices,
      fields: '*',
      types: ['date'],
      allow_no_indices: true,
      filters: '-nested,-metadata,-parent',
    });

    return Object.keys(fieldCapsResponse.fields);
  } catch (error) {
    console.error('Error retrieving timestamp fields:', error);
    return [];
  }
}
