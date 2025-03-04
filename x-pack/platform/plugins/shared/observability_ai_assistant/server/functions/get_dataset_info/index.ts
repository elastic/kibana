/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FunctionRegistrationParameters } from '..';
import { FunctionVisibility } from '../../../common/functions/types';
import { getRelevantFieldNames } from './get_relevant_field_names';

export const GET_DATASET_INFO_FUNCTION_NAME = 'get_dataset_info';

export function registerGetDatasetInfoFunction({
  resources,
  functions,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: GET_DATASET_INFO_FUNCTION_NAME,
      visibility: FunctionVisibility.AssistantOnly,
      description: `Use this function to get information about indices/datasets available and the fields available on them.

      providing empty string as index name will retrieve all indices
      else list of all fields for the given index will be given. if no fields are returned this means no indices were matched by provided index pattern.
      wildcards can be part of index name.`,
      descriptionForUser:
        'This function allows the assistant to get information about available indices and their fields.',
      parameters: {
        type: 'object',
        properties: {
          index: {
            type: 'string',
            description:
              'index pattern the user is interested in or empty string to get information about all available indices',
          },
        },
        required: ['index'],
      } as const,
    },
    async ({ arguments: { index }, messages, chat }, signal) => {
      const coreContext = await resources.context.core;

      const esClient = coreContext.elasticsearch.client;
      const savedObjectsClient = coreContext.savedObjects.client;

      let indices: string[] = [];

      try {
        const body = await esClient.asCurrentUser.indices.resolveIndex({
          name: index === '' ? ['*', '*:*'] : index.split(','),
          expand_wildcards: 'open',
        });
        indices = [
          ...body.indices.map((i) => i.name),
          ...body.data_streams.map((d) => d.name),
          ...body.aliases.map((d) => d.name),
        ];
      } catch (e) {
        indices = [];
      }

      if (index === '') {
        return {
          content: {
            indices,
            fields: [],
          },
        };
      }

      if (indices.length === 0) {
        return {
          content: {
            indices,
            fields: [],
          },
        };
      }

      const relevantFieldNames = await getRelevantFieldNames({
        index,
        messages,
        esClient: esClient.asCurrentUser,
        dataViews: await resources.plugins.dataViews.start(),
        savedObjectsClient,
        signal,
        chat,
      });
      return {
        content: {
          indices: [index],
          fields: relevantFieldNames.fields,
          stats: relevantFieldNames.stats,
        },
      };
    }
  );
}
