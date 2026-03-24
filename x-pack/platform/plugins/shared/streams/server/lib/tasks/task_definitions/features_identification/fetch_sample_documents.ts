/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { FeatureWithFilter } from '@kbn/streams-schema';
import { getSampleDocuments } from '@kbn/ai-tools/src/tools/describe_dataset/get_sample_documents';
import { conditionToQueryDsl, getConditionFields } from '@kbn/streamlang';
import type { Condition } from '@kbn/streamlang';
import { compact } from 'lodash';
import { getEntityFilters, MAX_FILTERS } from './get_entity_filters';

const DEFAULT_SAMPLE_SIZE = 20;
// Defines the proportion of the sample size (e.g., 60%) that should be fetched
// from a pool that excludes known features (via must_not filters). The remaining
// portion is backfilled with unfiltered, random documents to ensure a diverse sample.
const ENTITY_FILTERED_RATIO = 0.6;

export async function fetchSampleDocuments({
  esClient,
  index,
  start,
  end,
  features,
  logger,
  size = DEFAULT_SAMPLE_SIZE,
}: {
  esClient: ElasticsearchClient;
  index: string;
  start: number;
  end: number;
  features: FeatureWithFilter[];
  logger: Logger;
  size?: number;
}) {
  const entityFilters = getEntityFilters(features, MAX_FILTERS);
  if (entityFilters.length === 0) {
    const { hits } = await getSampleDocuments({ esClient, index, start, end, size });
    return { documents: hits, totalFilters: 0, filtersCapped: false, hasFilteredDocuments: false };
  }

  logger.debug(
    () =>
      `Fetching sample documents after excluding ${entityFilters.length} KI features (${
        features.length - entityFilters.length
      } omitted):\n${JSON.stringify(entityFilters, null, 2)}`
  );

  const runtimeMappings = await getRuntimeMappings(esClient, index, entityFilters);
  const entityFilteredSize = Math.round(size * ENTITY_FILTERED_RATIO);
  const [{ hits: entityFilteredDocs }, { hits: unfilteredDocs }] = await Promise.all([
    getSampleDocuments({
      esClient,
      index,
      start,
      end,
      timeout: '10s',
      size: entityFilteredSize,
      filter: { bool: { must_not: entityFilters.map(conditionToQueryDsl) } },
      runtime_mappings: runtimeMappings,
    }),
    getSampleDocuments({
      esClient,
      index,
      start,
      end,
      size,
    }),
  ]);

  const seenIds = new Set<string>(compact(entityFilteredDocs.map(({ _id }) => _id)));
  const backfill = unfilteredDocs.filter(({ _id }) => _id && !seenIds.has(_id));

  return {
    documents: [...entityFilteredDocs, ...backfill.slice(0, size - entityFilteredDocs.length)],
    totalFilters: features.length,
    filtersCapped: features.length > MAX_FILTERS,
    hasFilteredDocuments: entityFilteredDocs.length > 0,
  };
}

async function getRuntimeMappings(
  esClient: ElasticsearchClient,
  index: string,
  filters: Condition[]
): Promise<Record<string, { type: 'keyword' }>> {
  const usedFields = [
    ...new Set(filters.flatMap((filter) => getConditionFields(filter).map(({ name }) => name))),
  ];
  if (usedFields.length === 0) {
    return {};
  }

  const fieldCaps = await esClient.fieldCaps({ index, fields: usedFields });
  return Object.fromEntries(
    usedFields
      .filter((field) => !fieldCaps.fields[field])
      .map((field) => [field, { type: 'keyword' as const }])
  );
}
