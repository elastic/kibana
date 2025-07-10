/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { castArray, chunk, groupBy, uniq } from 'lodash';
import { lastValueFrom } from 'rxjs';
import { MessageRole, ShortIdTable, type Message } from '../../../common';
import { concatenateChatCompletionChunks } from '../../../common/utils/concatenate_chat_completion_chunks';
import { FunctionCallChatFunction } from '../../service/types';

export const SELECT_RELEVANT_FIELDS_NAME = 'select_relevant_fields';
export const GET_RELEVANT_FIELD_NAMES_SYSTEM_MESSAGE = `You are a helpful assistant for Elastic Observability. 
Your task is to determine which fields are relevant to the conversation by selecting only the field IDs from the provided list. 
The list in the user message consists of JSON objects that map a human-readable field "name" to its unique "id". 
You must not output any field names — only the corresponding "id" values. Ensure that your output follows the exact JSON format specified.`;

export async function getRelevantFieldNames({
  index,
  start,
  end,
  dataViews,
  esClient,
  savedObjectsClient,
  chat,
  messages,
  signal,
}: {
  index: string | string[];
  start?: string;
  end?: string;
  dataViews: DataViewsServerPluginStart;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  messages: Message[];
  chat: FunctionCallChatFunction;
  signal: AbortSignal;
}): Promise<{ fields: string[]; stats: { analyzed: number; total: number } }> {
  const dataViewsService = await dataViews.dataViewsServiceFactory(savedObjectsClient, esClient);

  const hasAnyHitsResponse = await esClient.search({
    index,
    _source: false,
    track_total_hits: 1,
    terminate_after: 1,
  });

  const hitCount =
    typeof hasAnyHitsResponse.hits.total === 'number'
      ? hasAnyHitsResponse.hits.total
      : hasAnyHitsResponse.hits.total?.value ?? 0;

  // all fields are empty in this case, so get them all
  const includeEmptyFields = hitCount === 0;

  const fields = await dataViewsService.getFieldsForWildcard({
    pattern: castArray(index).join(','),
    allowNoIndex: true,
    includeEmptyFields,
    indexFilter:
      start && end
        ? {
            range: {
              '@timestamp': {
                gte: datemath.parse(start)!.toISOString(),
                lt: datemath.parse(end)!.toISOString(),
              },
            },
          }
        : undefined,
  });

  // else get all the fields for the found dataview
  const response = {
    indices: [index],
    fields: fields.flatMap((field) => {
      return (field.esTypes ?? [field.type]).map((type) => {
        return {
          name: field.name,
          type,
        };
      });
    }),
  };

  const allFields = response.fields;

  const fieldNames = uniq(allFields.map((field) => field.name));

  const groupedFields = groupBy(allFields, (field) => field.name);

  const shortIdTable = new ShortIdTable();

  const MAX_CHUNKS = 5;
  const FIELD_NAMES_PER_CHUNK = 250;

  const fieldNamesToAnalyze = fieldNames.slice(0, MAX_CHUNKS * FIELD_NAMES_PER_CHUNK);

  const relevantFields = await Promise.all(
    chunk(fieldNamesToAnalyze, FIELD_NAMES_PER_CHUNK).map(async (fieldsInChunk) => {
      const chunkResponse$ = (
        await chat('get_relevant_dataset_names', {
          signal,
          stream: true,
          systemMessage: GET_RELEVANT_FIELD_NAMES_SYSTEM_MESSAGE,
          messages: [
            // remove the last function request
            ...messages.slice(0, -1),
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.User,
                content: `Below is a list of fields. Each entry is a JSON object that contains a "name" (the field name) and an "id" (the unique identifier). Use only the "id" values from this list when selecting relevant fields:

            ${fieldsInChunk
              .map((fieldName) =>
                JSON.stringify({ name: fieldName, id: shortIdTable.take(fieldName) })
              )
              .join('\n')}`,
              },
            },
          ],
          functions: [
            {
              name: SELECT_RELEVANT_FIELDS_NAME,
              description: `Return only the field IDs (from the provided list) that you consider relevant to the conversation. Do not use any of the field names. Your response must be in the exact JSON format:
              {
                "fieldIds": ["id1", "id2", "id3"]
              }
              Only include IDs from the list provided in the user message.`,
              parameters: {
                type: 'object',
                properties: {
                  fieldIds: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                  },
                },
                required: ['fieldIds'],
              } as const,
            },
          ],
          functionCall: SELECT_RELEVANT_FIELDS_NAME,
        })
      ).pipe(concatenateChatCompletionChunks());

      const chunkResponse = await lastValueFrom(chunkResponse$);

      return chunkResponse.message?.function_call?.arguments
        ? (
            JSON.parse(chunkResponse.message.function_call.arguments) as {
              fieldIds: string[];
            }
          ).fieldIds
            .map((fieldId) => {
              const fieldName = shortIdTable.lookup(fieldId);
              return fieldName ?? fieldId;
            })
            .filter((fieldName) => {
              return fieldsInChunk.includes(fieldName);
            })
            .map((field) => {
              const fieldDescriptors = groupedFields[field];
              return `${field}:${fieldDescriptors.map((descriptor) => descriptor.type).join(',')}`;
            })
        : [chunkResponse.message?.content ?? ''];
    })
  );

  return {
    fields: relevantFields.flat(),
    stats: { analyzed: fieldNamesToAnalyze.length, total: fieldNames.length },
  };
}
