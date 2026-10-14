/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { take } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import { EsResourceType, isVisibleSearchSource } from '@kbn/agent-builder-common';
import { isNotFoundError } from '@kbn/es-errors';
import { listDatasets } from '../utils/datasets';
import { listViews } from '../utils/views';

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

export interface DatasetSearchSource {
  type: EsResourceType.dataset;
  name: string;
  data_source: string;
  resource: string;
}

export interface ViewSearchSource {
  type: EsResourceType.view;
  name: string;
  query: string;
  description?: string;
}

export type EsSearchSource =
  | DataStreamSearchSource
  | AliasSearchSource
  | IndexSearchSource
  | DatasetSearchSource
  | ViewSearchSource;

export interface ListSourcesResponse {
  indices: IndexSearchSource[];
  aliases: AliasSearchSource[];
  data_streams: DataStreamSearchSource[];
  datasets: DatasetSearchSource[];
  views: ViewSearchSource[];
  warnings?: string[];
}

/**
 * Matches an external dataset name against an Elasticsearch-style index pattern.
 * Supports comma-separated globs with `*` wildcards and `-`-prefixed exclusions
 * (e.g. `*`, `emp*`, `a,b-*`, `logs-*,-logs-old`), mirroring how `_resolve/index`
 * honors exclusions for indices, aliases and data streams.
 */
const matchesSearchSourcePattern = (name: string, pattern: string): boolean => {
  const toRegExp = (glob: string) =>
    new RegExp(`^${glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);

  const parts = pattern
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const includes = parts.filter((part) => !part.startsWith('-'));
  const excludes = parts.filter((part) => part.startsWith('-')).map((part) => part.slice(1));

  const included =
    includes.length === 0 || includes.some((part) => part === '*' || toRegExp(part).test(name));
  const excluded = excludes.some((part) => part === '*' || toRegExp(part).test(name));
  return included && !excluded;
};

/**
 * List the search sources (indices, aliases and datastreams) matching a given index pattern,
 * using the `_resolve_index` API.
 *
 * When `includeDatasets` is true, external ES|QL datasets (registered via `_query/dataset`) are
 * additionally fetched and returned. When `includeViews` is true, ES|QL views (registered via
 * `_query/view`) are fetched the same way. Both are opt-in because they are only queryable via
 * ES|QL, so callers backing a `_search` flow (or that only need index/alias/datastream
 * classification) should leave them off to avoid an extra request.
 */
export const listSearchSources = async ({
  pattern,
  perTypeLimit = 100,
  includeHidden = false,
  excludeIndicesRepresentedAsAlias = true,
  excludeIndicesRepresentedAsDatastream = true,
  includeDatasets = false,
  includeViews = false,
  esClient,
}: {
  pattern: string;
  perTypeLimit?: number;
  includeHidden?: boolean;
  excludeIndicesRepresentedAsAlias?: boolean;
  excludeIndicesRepresentedAsDatastream?: boolean;
  includeDatasets?: boolean;
  includeViews?: boolean;
  esClient: ElasticsearchClient;
}): Promise<ListSourcesResponse> => {
  // External ES|QL datasets and views are not returned by `_resolve/index`, so fetch and
  // filter them by name separately. Resolved outside the try below so a `NotFound` from
  // `resolveIndex` (e.g. when `pattern` is an exact view or dataset name) doesn't discard them.
  const datasetSources = includeDatasets
    ? (await listDatasets({ esClient }))
        .filter((dataset) => isVisibleSearchSource(dataset.name))
        .filter((dataset) => matchesSearchSourcePattern(dataset.name, pattern))
        .map<DatasetSearchSource>((dataset) => {
          return {
            type: EsResourceType.dataset,
            name: dataset.name,
            data_source: dataset.data_source,
            resource: dataset.resource,
          };
        })
    : [];

  const viewSources = includeViews
    ? (await listViews({ esClient }))
        .filter((view) => isVisibleSearchSource(view.name))
        .filter((view) => matchesSearchSourcePattern(view.name, pattern))
        .map<ViewSearchSource>((view) => {
          return {
            type: EsResourceType.view,
            name: view.name,
            query: view.query,
            ...(view.description ? { description: view.description } : {}),
          };
        })
    : [];

  try {
    const resolveRes = await esClient.indices.resolveIndex({
      name: [pattern],
      allow_no_indices: true,
      expand_wildcards: includeHidden ? ['open', 'hidden'] : ['open'],
    });

    // data streams — apply the allow-list visibility filter by name.
    const dataStreamSources = resolveRes.data_streams
      .filter((dataStream) => isVisibleSearchSource(dataStream.name))
      .map<DataStreamSearchSource>((dataStream) => {
        return {
          type: EsResourceType.dataStream,
          name: dataStream.name,
          indices: Array.isArray(dataStream.backing_indices)
            ? dataStream.backing_indices
            : [dataStream.backing_indices],
          timestamp_field: dataStream.timestamp_field,
        };
      });

    // aliases — apply the allow-list visibility filter by name.
    const aliasSources = resolveRes.aliases
      .filter((alias) => isVisibleSearchSource(alias.name))
      .map<AliasSearchSource>((alias) => {
        return {
          type: EsResourceType.alias,
          name: alias.name,
          indices: Array.isArray(alias.indices) ? alias.indices : [alias.indices],
        };
      });

    const resolvedDataStreamNames = resolveRes.data_streams.map((ds) => ds.name);
    const resolvedAliasNames = resolveRes.aliases.map((alias) => alias.name);

    const indexSources = resolveRes.indices
      .filter((index) => {
        if (!isVisibleSearchSource(index.name)) {
          return false;
        }

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
    if (datasetSources.length > perTypeLimit) {
      warnings.push(
        `Datasets results truncated to ${perTypeLimit} elements - Total result count was ${datasetSources.length}`
      );
    }
    if (viewSources.length > perTypeLimit) {
      warnings.push(
        `Views results truncated to ${perTypeLimit} elements - Total result count was ${viewSources.length}`
      );
    }

    return {
      warnings,
      data_streams: take(dataStreamSources, perTypeLimit),
      aliases: take(aliasSources, perTypeLimit),
      indices: take(indexSources, perTypeLimit),
      datasets: take(datasetSources, perTypeLimit),
      views: take(viewSources, perTypeLimit),
    };
  } catch (e) {
    if (isNotFoundError(e)) {
      const esqlSourceCount = datasetSources.length + viewSources.length;
      return {
        data_streams: [],
        aliases: [],
        indices: [],
        datasets: take(datasetSources, perTypeLimit),
        views: take(viewSources, perTypeLimit),
        warnings: esqlSourceCount > 0 ? [] : ['No sources found.'],
      };
    }
    throw e;
  }
};
