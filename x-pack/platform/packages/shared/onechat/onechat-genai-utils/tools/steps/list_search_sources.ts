/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';

export interface DataStreamSearchSource {
  type: 'datastream';
  name: string;
  indices: string[];
  timestamp_field: string;
}

export interface AliasSearchSource {
  type: 'alias';
  name: string;
  indices: string[];
}

export interface IndexSearchSource {
  type: 'index';
  name: string;
}

export type EsSearchSource = DataStreamSearchSource | AliasSearchSource | IndexSearchSource;

export interface ListSourcesResponse {
  sources: EsSearchSource[];
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
        type: 'datastream',
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
        type: 'alias',
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
          type: 'index',
          name: index.name,
        };
      });

    const warnings: string[] = [];
    if (dataStreamSources.length > perTypeLimit) {
      warnings.push(
        `DataSource results truncated to ${perTypeLimit} elements - Total result count was ${dataStreamSources.length}`
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
      sources: [
        ...take(dataStreamSources, perTypeLimit),
        ...take(aliasSources, perTypeLimit),
        ...take(indexSources, perTypeLimit),
      ],
    };
  } catch (e) {
    if (isNotFoundError(e)) {
      return {
        sources: [],
        warnings: ['No sources found.'],
      };
    }
    throw e;
  }
};
