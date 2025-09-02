/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { indexPatternToCss } from '@kbn/std';
import { ElasticsearchClient } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import { castArray } from 'lodash';
import { ToolCall, truncateList } from '@kbn/inference-common';

type ListDatasetsToolCall = ToolCall<string, { index: string[]; include_kibana_indices?: boolean }>;

export interface ListDatasetsToolCallResponse {
  indices: string[];
  data_streams: string[];
  warning?: string;
}

export function createListDatasetsToolCallback({ esClient }: { esClient: ElasticsearchClient }) {
  return (toolCall: ListDatasetsToolCall): Promise<ListDatasetsToolCallResponse> => {
    const includeKibanaIndices = toolCall.function.arguments.include_kibana_indices ?? false;

    return listDatasets({
      names: toolCall.function.arguments.index,
      includeKibanaIndices,
      esClient,
    }).then(async (response) => {
      if (!toolCall.function.name.length) {
        return response;
      }

      if (response.data_streams.length === 0 && response.indices.length === 0) {
        response = await listDatasets({ names: [], includeKibanaIndices, esClient });
        return response.data_streams.length || response.indices.length
          ? {
              ...response,
              warning: `No datasets found for ${toolCall.function.arguments.index.join(
                ', '
              )} - listing all datasets`,
            }
          : response;
      }
      return response;
    });
  };
}

function listDatasets({
  names,
  includeKibanaIndices,
  esClient,
}: {
  names: string[];
  includeKibanaIndices: boolean;
  esClient: ElasticsearchClient;
}) {
  const name = names.flatMap((index) => {
    if (!index.startsWith('*')) {
      index = `*${index}`;
    }

    if (!index.endsWith('*')) {
      index = `${index}*`;
    }

    return index;
  });

  if (!name.length) {
    name.push(...indexPatternToCss('*'));
  }

  if (includeKibanaIndices) {
    name.push('-.*');
  }

  return esClient.indices
    .resolveIndex({
      name: name.flatMap((item) => indexPatternToCss(item)),
      allow_no_indices: true,
    })
    .catch((error) => {
      if (error instanceof errors.ResponseError && error.statusCode === 404) {
        return {
          data_streams: [],
          indices: [],
          aliases: [],
        };
      }
      throw error;
    })
    .then((response) => {
      const dataStreams = response.data_streams.map((dataStream) => {
        return {
          name: dataStream.name,
          timestamp_field: dataStream.timestamp_field,
        };
      });

      const aliases = response.aliases.map((alias) => {
        return {
          name: alias.name,
          ...(alias.indices ? { indices: truncateList(castArray(alias.indices), 5) } : {}),
        };
      });

      const allAliases = aliases.map((alias) => alias.name);

      const allDataStreamNames = dataStreams.map((dataStream) => dataStream.name);

      const indices = response.indices
        .filter((index) => {
          if (index.data_stream) {
            const isRepresentedAsDataStream = allDataStreamNames.includes(index.data_stream);

            return !isRepresentedAsDataStream;
          }

          if (index.aliases?.length) {
            const isRepresentedAsAlias = index.aliases.some((alias) => allAliases.includes(alias));
            return !isRepresentedAsAlias;
          }

          return true;
        })
        .map((index) => {
          return index.name;
        });

      return {
        indices: truncateList(indices, 250),
        data_streams: truncateList(
          response.data_streams.map((dataStream) => {
            return `${dataStream.name} (${dataStream.timestamp_field})`;
          }),
          250
        ),
      };
    });
}
