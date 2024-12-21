/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import dedent from 'dedent';
import { lastValueFrom } from 'rxjs';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import { compact } from 'lodash';
import { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { concatenateChatCompletionChunks, Message, MessageRole } from '../../../common';
import type { FunctionCallChatFunction } from '../../service/types';
import { getConnectorIndices } from '../../service/knowledge_base_service/recall_from_search_connectors';

export interface UserPromptAndFiltersForSearchConnector {
  userPrompt: string;
  indexPattern: string;
  filters: QueryDslQueryContainer[];
}

export async function rewriteUserPromptForSearchConnectors({
  esClient,
  uiSettingsClient,
  messages,
  userPrompt,
  screenDescription,
  chat,
  signal,
  logger,
}: {
  esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient };
  uiSettingsClient: IUiSettingsClient;
  messages: Message[];
  userPrompt: string;
  screenDescription: string | undefined;
  chat: FunctionCallChatFunction;
  signal: AbortSignal;
  logger: Logger;
}): Promise<UserPromptAndFiltersForSearchConnector[]> {
  const connectorIndices = await getConnectorIndices({ esClient, uiSettingsClient, logger });

  try {
    const values = await Promise.all(
      connectorIndices.map((indexPattern) => {
        return rewritePromptForConnector({
          indexPattern,
          esClient,
          messages,
          userPrompt,
          screenDescription,
          chat,
          signal,
          logger,
        });
      })
    );
    return values;
  } catch (error) {
    logger.error(`Error rewriting prompt: ${error}`);
    return [];
  }
}

async function rewritePromptForConnector({
  indexPattern,
  esClient,
  messages,
  userPrompt,
  screenDescription,
  chat,
  signal,
  logger,
}: {
  indexPattern: string;
  esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient };
  messages: Message[];
  userPrompt: string;
  screenDescription: string | undefined;
  chat: FunctionCallChatFunction;
  signal: AbortSignal;
  logger: Logger;
}): Promise<UserPromptAndFiltersForSearchConnector> {
  const timestampFields = await getTimestampFields({ esClient, indexPattern, logger });
  const lowCardinalityKeywordFields = await getLowCardinalityKeywordFields({
    esClient,
    indexPattern,
    chat,
    signal,
    logger,
  });

  const REWRITE_USER_PROMPT_FUNCTION_NAME = `rewrite_user_prompt-${indexPattern}`;

  const keywordExample = lowCardinalityKeywordFields[0];
  const dateFieldExample = timestampFields[0];

  if (!keywordExample && !dateFieldExample) {
    logger.error(`No keyword fields and no date fields found for index pattern ${indexPattern}`);
    return {
      userPrompt,
      indexPattern,
      filters: [],
    };
  }

  const queryFilterItems = compact([
    ...lowCardinalityKeywordFields.map(
      ({ field, values, description }) =>
        ({
          type: 'object' as const,
          properties: {
            field: { const: field },
            description: { const: description },
            value: { enum: values },
          },
          required: ['field', 'value'],
          additionalProperties: false,
        } as const)
    ),
    ...(timestampFields.length === 0
      ? []
      : [
          {
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
            additionalProperties: false,
          } as const,
        ]),
  ]);

  const rewriteUserPromptFunction = {
    strict: true,
    name: REWRITE_USER_PROMPT_FUNCTION_NAME,
    description: `Rewrites the user prompt into a concise search query and infers term filters and date range filter to be used for filtering the dataset in Elasticsearch.

          ## Example
          User prompt: "List all the bug reports that were opened for the front page this week?" 
          Screen description: "User is looking at the front page of the website"

          Return value:
          """
          {
            "rewrittenUserPrompt": "front page bugs",
            "queryFilters": [
              ${
                keywordExample
                  ? `{ "field": "${keywordExample.field}", "description": "${keywordExample.description}, "value": ${keywordExample.values[0]} }`
                  : ''
              },
              ${
                dateFieldExample
                  ? `{ "field": "${dateFieldExample}", "gte": "now-7d/d", "lte": "now/d" }`
                  : ''
              }
            ],
          }
          """

          Example if no filters match:
          """
          {
            "rewrittenUserPrompt": "front page bugs",
            "queryFilters": [],
          }
          """          

        `,
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['rewrittenUserPrompt'],
      properties: {
        rewrittenUserPrompt: {
          type: 'string',
          description:
            "A single sentence that captures the core of the user's intent. The rewritten user prompt will be used as a semantic search query.",
        },
        queryFilters: {
          type: 'array',
          description:
            'A list of Elasticsearch filters for exactly matching keyword fields. The filters are used to narrow down the search results based on user intent.',
          items: {
            type: 'object',
            description: 'A filter object for a named keyword field, filtered by a specific value.',
            oneOf: queryFilterItems,
          },
        },
      },
    } as const,
  };

  logger.debug(
    `Rewrite user prompt function schema: ${JSON.stringify(rewriteUserPromptFunction, null, 2)}`
  );

  const newUserMessage: Message = {
    '@timestamp': new Date().toISOString(),
    message: {
      role: MessageRole.User,
      content: dedent(
        `Given the following user prompt, screen description, and the available field information, rewrite the user prompt and infer query filters based on the user's intent. Ensure that:
        - The rewritten prompt is concise and represents the core of the user's query.
        - The filters include relevant fields (e.g., keyword fields or date ranges) to narrow down the dataset.

        User prompt: 
        ${userPrompt}

        Screen description:
        ${screenDescription}

        Keyword fields that can be used to filter the dataset:
        ${JSON.stringify(lowCardinalityKeywordFields)}

        Available date fields that can be used to filter the dataset:
        ${timestampFields}
        `
      ),
    },
  };

  const response = await lastValueFrom(
    chat(`function call: ${REWRITE_USER_PROMPT_FUNCTION_NAME}`, {
      messages: [...messages.slice(0, -2), newUserMessage],
      functions: [rewriteUserPromptFunction],
      functionCall: REWRITE_USER_PROMPT_FUNCTION_NAME,
      signal,
    }).pipe(concatenateChatCompletionChunks())
  );

  logger.debug(`response ${JSON.stringify(response, null, 2)}`);

  const parsedArgs = JSON.parse(response.message.function_call.arguments) as {
    rewrittenUserPrompt: string;
    queryFilters: Array<
      { field: string; value: string } | { field: string; gte: string; lte: string }
    >;
  };

  return {
    userPrompt: parsedArgs.rewrittenUserPrompt,
    indexPattern,
    filters: compact([
      ...(parsedArgs.queryFilters ?? []).map((filter) => {
        if ('value' in filter) {
          return { term: { [filter.field]: filter.value } };
        }

        if ('gte' in filter) {
          return { range: { [filter.field]: { gte: filter.gte, lte: filter.lte } } };
        }
      }),
    ]),
  };
}

async function getLowCardinalityKeywordFields({
  esClient,
  indexPattern,
  chat,
  signal,
  logger,
}: {
  esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient };
  indexPattern: string;
  chat: FunctionCallChatFunction;
  signal: AbortSignal;
  logger: Logger;
}): Promise<Array<{ field: string; description: string; values: string[] }>> {
  try {
    const ADD_DESCRIPTION_FUNCTION_NAME = `add_description-${indexPattern}`;

    // Get all keyword fields using field_caps
    const fieldCapsResponse = await esClient.asCurrentUser.fieldCaps({
      index: indexPattern,
      fields: '*',
      types: ['keyword'],
      allow_no_indices: true,
      filters: '-nested,-metadata,-parent',
    });

    // For each keyword field, get its unique values using _terms_enum
    const keywordItems = await Promise.all(
      Object.keys(fieldCapsResponse.fields).map(async (field) => {
        const termsEnumResponse = await esClient.asCurrentUser.termsEnum({
          index: indexPattern,
          field,
          size: 10,
        });

        return { field, values: termsEnumResponse.terms };
      })
    );

    const keywordExampleFiltered = keywordItems.filter(
      ({ values }) => values.length > 0 && values.length < 10
    );
    if (!keywordExampleFiltered.length) return [];

    try {
      const _items = keywordExampleFiltered.map(
        ({ field, values }) =>
          ({
            type: 'object' as const,
            properties: {
              field: { const: field },
              value: { enum: values },
            },
            required: ['field', 'value'],
            additionalProperties: true,
          } as const)
      );

      const newUserMessage: Message = {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.User,
          content: dedent(
            `
            The description should explain what the field represents, keeping the example values in mind.
  
            Given the following list of filters, provide a concise description for each field. Ensure that:
            - The description should explain what the field represents.
            - keeping the example values in mind.
  
            queryFilters:
            ${JSON.stringify(keywordExampleFiltered)}
            `
          ),
        },
      };

      const addDescriptionFunction = {
        strict: true,
        name: ADD_DESCRIPTION_FUNCTION_NAME,
        description: `add a description.
    
              ## Example
              {
                "queryFilters": [{
                  "field": "type.enum",
                  "values": ["file","folder"],
                }]
              }
              ...
  
              Return value:
              """
              {
                "queryFilters": [{
                  "field": "type.enum",
                  "values": ["file","folder"],
                  "description": "The 'type.enum' field represents the type of object. This can be either 'file' or 'folder'."
                }]
              }
              """
            }
    
            `,
        parameters: {
          type: 'object',
          additionalProperties: false,
          required: [],
          properties: {
            queryFilters: {
              type: 'array',
              description:
                'A list of Elasticsearch filters for exactly matching keyword fields. The filters are used to narrow down the search results based on user intent.',
              items: {
                type: 'object',
                description:
                  'A filter object for a named keyword field, filtered by a specific value.',
              },
            },
          },
        } as const,
      };

      const response = await lastValueFrom(
        chat(`function call: ${ADD_DESCRIPTION_FUNCTION_NAME}`, {
          messages: [newUserMessage],
          functions: [addDescriptionFunction],
          functionCall: ADD_DESCRIPTION_FUNCTION_NAME,
          signal,
        }).pipe(concatenateChatCompletionChunks())
      );

      // Return the low-cardinality fields
      return JSON.parse(response.message.function_call.arguments).queryFilters;
    } catch (error) {
      logger.error(`Error retrieving low-cardinality fields: ${error.message}`);
      return keywordExampleFiltered.map(({ field, values }) => ({
        field,
        values,
        description: '',
      }));
    }
  } catch (error) {
    logger.error(`Error retrieving low-cardinality fields: ${error.message}`);
    return [];
  }
}

async function getTimestampFields({
  esClient,
  indexPattern,
  logger,
}: {
  esClient: { asCurrentUser: ElasticsearchClient; asInternalUser: ElasticsearchClient };
  indexPattern: string;
  logger: Logger;
}): Promise<string[]> {
  try {
    const fieldCapsResponse = await esClient.asCurrentUser.fieldCaps({
      index: indexPattern,
      fields: '*',
      types: ['date'],
      allow_no_indices: true,
      filters: '-nested,-metadata,-parent',
    });

    return Object.keys(fieldCapsResponse.fields);
  } catch (error) {
    logger.error(`Error retrieving timestamp fields: ${error.message}`);
    return [];
  }
}
