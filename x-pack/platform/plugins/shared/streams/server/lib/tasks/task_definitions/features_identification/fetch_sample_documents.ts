/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { FeatureWithFilter } from '@kbn/streams-schema';
import { getDiverseSampleDocuments, getSampleDocuments } from '@kbn/ai-tools';
import { conditionToQueryDsl, getConditionFields } from '@kbn/streamlang';
import type { Condition } from '@kbn/streamlang';
import { getEntityFilters, MAX_FILTERS } from './get_entity_filters';

const DEFAULT_SAMPLE_SIZE = 20;
// The sample is split into three buckets to balance novelty and coverage:
//  - Entity-filtered (ENTITY_FILTERED_RATIO): diverse docs that exclude known features
//    via must_not filters, biasing toward undiscovered patterns.
//  - Diverse (DIVERSE_RATIO): unfiltered diverse docs for broad field-value coverage.
//  - Random (remainder): unfiltered random docs to avoid systematic sampling blind spots.
const ENTITY_FILTERED_RATIO = 0.4;
const DIVERSE_RATIO = 0.4;

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
    const diverseSize = Math.round(size * (ENTITY_FILTERED_RATIO + DIVERSE_RATIO));
    const randomSize = size - diverseSize;

    const [{ hits: diverseHits }, { hits: randomHits }] = await Promise.all([
      getDiverseSampleDocuments({ esClient, index, start, end, size: diverseSize }),
      getSampleDocuments({ esClient, index, start, end, size: randomSize + diverseSize }),
    ]);

    const documents = mergeBuckets([
      { hits: diverseHits, cap: diverseSize },
      { hits: randomHits, cap: randomSize },
    ]);
    return { documents, totalFilters: 0, filtersCapped: false, hasFilteredDocuments: false };
  }

  logger.debug(
    () =>
      `Fetching sample documents after excluding ${entityFilters.length} KI features (${
        features.length - entityFilters.length
      } omitted):\n${JSON.stringify(entityFilters, null, 2)}`
  );

  const runtimeMappings = await getRuntimeMappings(esClient, index, entityFilters);
  const entityFilteredSize = Math.round(size * ENTITY_FILTERED_RATIO);
  const diverseSize = Math.round(size * DIVERSE_RATIO);
  const randomSize = size - entityFilteredSize - diverseSize;

  const [{ hits: entityFilteredHits }, { hits: diverseHits }, { hits: randomHits }] =
    await Promise.all([
      getSampleDocuments({
        esClient,
        index,
        start,
        end,
        size: entityFilteredSize,
        filter: { bool: { must_not: entityFilters.map(conditionToQueryDsl) } },
        runtime_mappings: runtimeMappings,
      }),
      getDiverseSampleDocuments({
        esClient,
        index,
        start,
        end,
        size: diverseSize + entityFilteredSize,
      }),
      getSampleDocuments({
        esClient,
        index,
        start,
        end,
        size: randomSize + entityFilteredSize + diverseSize,
      }),
    ]);

  const documents = mergeBuckets([
    { hits: entityFilteredHits, cap: entityFilteredSize },
    { hits: diverseHits, cap: diverseSize },
    { hits: randomHits, cap: randomSize },
  ]);

  return {
    documents,
    totalFilters: features.length,
    filtersCapped: features.length > MAX_FILTERS,
    hasFilteredDocuments: entityFilteredHits.length > 0,
  };
}

interface Bucket {
  hits: Array<SearchHit<Record<string, unknown>>>;
  cap: number;
}

function mergeBuckets(buckets: Bucket[]): Array<SearchHit<Record<string, unknown>>> {
  const seen = new Set<string>();
  const result: Array<SearchHit<Record<string, unknown>>> = [];

  for (const { hits, cap } of buckets) {
    let added = 0;
    for (const hit of hits) {
      if (added >= cap) break;
      if (hit._id && seen.has(hit._id)) continue;
      if (hit._id) seen.add(hit._id);
      result.push(hit);
      added++;
    }
  }

  return result;
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
