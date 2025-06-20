/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { Message } from '../../../common';
import { FunctionRegistrationParameters } from '..';
import { FunctionVisibility } from '../../../common/functions/types';
import { FunctionCallChatFunction, RespondFunctionResources } from '../../service/types';
import { getRelevantFieldNames } from './get_relevant_field_names';

export const GET_DATASET_INFO_FUNCTION_NAME = 'get_dataset_info';

export function registerGetDatasetInfoFunction({
  resources,
  functions,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: GET_DATASET_INFO_FUNCTION_NAME,
      visibility: FunctionVisibility.All,
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
              'Please specify the index pattern(s) that are relevant to the user\'s query. You are allowed to specify multiple, comma-separated patterns like "index1,index2". If you provide an empty string, it will search across all indicies in all clusters. By default indicies that match the pattern in both local and remote clusters are searched. If you want to limit the search to a specific cluster you can prefix the index pattern with the cluster name. For example, "cluster1:my-index".',
          },
        },
        required: ['index'],
      } as const,
    },
    async ({ arguments: { index: indexPattern }, messages, chat }, signal) => {
      const content = await getDatasetInfo({ resources, indexPattern, signal, messages, chat });
      return { content };
    }
  );
}

export async function getDatasetInfo({
  resources,
  indexPattern,
  signal,
  messages,
  chat,
}: {
  resources: RespondFunctionResources;
  indexPattern: string;
  signal: AbortSignal;
  messages: Message[];
  chat: FunctionCallChatFunction;
}) {
  const coreContext = await resources.context.core;
  const esClient = coreContext.elasticsearch.client;
  const savedObjectsClient = coreContext.savedObjects.client;

  const indices = await getIndicesFromIndexPattern(indexPattern, esClient, resources.logger);
  if (indices.length === 0 || indexPattern === '') {
    return { indices, fields: [] };
  }

  try {
    const { fields, stats } = await getRelevantFieldNames({
      index: indices,
      messages,
      esClient: esClient.asCurrentUser,
      dataViews: await resources.plugins.dataViews.start(),
      savedObjectsClient,
      signal,
      chat,
    });
    return { indices, fields, stats };
  } catch (e) {
    resources.logger.error(`Error getting relevant field names: ${e.message}`);
    return { indices, fields: [] };
  }
}

async function getIndicesFromIndexPattern(
  indexPattern: string,
  esClient: IScopedClusterClient,
  logger: Logger
) {
  let name: string[] = [];
  if (indexPattern === '') {
    name = ['*', '*:*'];
  } else {
    name = indexPattern.split(',').flatMap((pattern) => {
      // search specific cluster
      if (pattern.includes(':')) {
        const [cluster, p] = pattern.split(':');
        return `${cluster}:*${p}*`;
      }

      // search across local and remote clusters
      return [`*${pattern}*`, `*:*${pattern}*`];
    });
  }

  try {
    const body = await esClient.asCurrentUser.indices.resolveIndex({
      name,
      expand_wildcards: 'open', // exclude hidden and closed indices
    });

    // if there is an exact match, only return that
    const hasExactMatch =
      body.indices.some((i) => i.name === indexPattern) ||
      body.aliases.some((i) => i.name === indexPattern);

    if (hasExactMatch) {
      return [indexPattern];
    }

    // otherwise return all matching indices, data streams, and aliases
    return [
      ...body.indices.map((i) => i.name),
      ...body.data_streams.map((d) => d.name),
      ...body.aliases.map((d) => d.name),
    ];
  } catch (e) {
    logger.error(`Error resolving index pattern: ${e.message}`);
    return [];
  }
}
