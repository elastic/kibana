/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import { EsResourceType } from '@kbn/agent-builder-common';
import { isNotFoundError } from '@kbn/es-errors';

export interface DataStreamSearchSource {
  type: EsResourceType.dataStream;
  name: string;
  indices: string[];
  timestamp_field: string;
}

export interface AliasSearchSource {
  type: EsResourceType.alias;
  name: string;
  indices: string[];
}

export interface IndexSearchSource {
  type: EsResourceType.index;
  name: string;
}

export type EsSearchSource = DataStreamSearchSource | AliasSearchSource | IndexSearchSource;

export interface ListSourcesResponse {
  indices: IndexSearchSource[];
  aliases: AliasSearchSource[];
  data_streams: DataStreamSearchSource[];
  warnings?: string[];
}

const kibanaIndicesExclusionPattern = '-.*';

/**
 * List the search sources (indices, aliases and datastreams) matching a given index pattern,
 * using the `_resolve_index` API.
 */
export const listSearchSources = async ({
  pattern,
  perTypeLimit = 100,
  includeHidden = false,
  includeKibanaIndices = false,
  excludeIndicesRepresentedAsAlias = true,
  excludeIndicesRepresentedAsDatastream = true,
  esClient,
}: {
  pattern: string;
  perTypeLimit?: number;
  includeHidden?: boolean;
  includeKibanaIndices?: boolean;
  excludeIndicesRepresentedAsAlias?: boolean;
  excludeIndicesRepresentedAsDatastream?: boolean;
  esClient: ElasticsearchClient;
}): Promise<ListSourcesResponse> => {
  try {
    const resolveRes = await esClient.indices.resolveIndex({
      name: includeKibanaIndices ? [pattern] : [pattern, kibanaIndicesExclusionPattern],
      allow_no_indices: true,
      expand_wildcards: includeHidden ? ['open', 'hidden'] : ['open'],
    });

    // data streams
    const dataStreamSources = resolveRes.data_streams.map<DataStreamSearchSource>((dataStream) => {
      return {
        type: EsResourceType.dataStream,
        name: dataStream.name,
        indices: Array.isArray(dataStream.backing_indices)
          ? dataStream.backing_indices
          : [dataStream.backing_indices],
        timestamp_field: dataStream.timestamp_field,
      };
    });

    // aliases
    const aliasSources = resolveRes.aliases.map<AliasSearchSource>((alias) => {
      return {
        type: EsResourceType.alias,
        name: alias.name,
        indices: Array.isArray(alias.indices) ? alias.indices : [alias.indices],
      };
    });

    // indices
    const resolvedDataStreamNames = dataStreamSources.map((ds) => ds.name);
    const resolvedAliasNames = aliasSources.map((alias) => alias.name);

    const indexSources = resolveRes.indices
      .filter((index) => {
        if (
          excludeIndicesRepresentedAsAlias &&
          index.aliases?.length &&
          index.aliases.some((alias) => resolvedAliasNames.includes(alias))
        ) {
          return false;
        }

        if (
          excludeIndicesRepresentedAsDatastream &&
          index.data_stream &&
          resolvedDataStreamNames.includes(index.data_stream)
        ) {
          return false;
        }

        return true;
      })
      .map<IndexSearchSource>((index) => {
        return {
          type: EsResourceType.index,
          name: index.name,
        };
      });

    const warnings: string[] = [];
    if (dataStreamSources.length > perTypeLimit) {
      warnings.push(
        `DataStreams results truncated to ${perTypeLimit} elements - Total result count was ${dataStreamSources.length}`
      );
    }
    if (aliasSources.length > perTypeLimit) {
      warnings.push(
        `Aliases results truncated to ${perTypeLimit} elements - Total result count was ${aliasSources.length}`
      );
    }
    if (indexSources.length > perTypeLimit) {
      warnings.push(
        `Indices results truncated to ${perTypeLimit} elements - Total result count was ${indexSources.length}`
      );
    }

    return {
      warnings,
      data_streams: take(dataStreamSources, perTypeLimit),
      aliases: take(aliasSources, perTypeLimit),
      indices: take(indexSources, perTypeLimit),
    };
  } catch (e) {
    if (isNotFoundError(e)) {
      return {
        data_streams: [],
        aliases: [],
        indices: [],
        warnings: ['No sources found.'],
      };
    }
    throw e;
  }
};
