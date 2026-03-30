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
import { parseError } from '../../../streams/errors/parse_error';

const EMPTY_SAMPLE: { hits: Array<SearchHit<Record<string, unknown>>> } = { hits: [] };

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
    const diverseSize = Math.round(size * DIVERSE_RATIO);

    const [{ hits: diverseHits }, { hits: randomHits }] = await Promise.all([
      getDiverseSampleDocuments({ esClient, index, start, end, size: diverseSize }),
      getSampleDocuments({ esClient, index, start, end, size }),
    ]);

    const documents = mergeDocuments(
      [
        { hits: diverseHits, cap: diverseSize },
        { hits: randomHits, cap: size },
      ],
      size
    );
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
      }).catch((err) => {
        logger.warn(`Entity-filtered sampling query failed: ${parseError(err).message}`);
        return EMPTY_SAMPLE;
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
        size,
      }),
    ]);

  const documents = mergeDocuments(
    [
      { hits: entityFilteredHits, cap: entityFilteredSize },
      { hits: diverseHits, cap: diverseSize },
      { hits: randomHits, cap: size },
    ],
    size
  );

  return {
    documents,
    totalFilters: features.length,
    filtersCapped: features.length > MAX_FILTERS,
    hasFilteredDocuments: entityFilteredHits.length > 0,
  };
}

function mergeDocuments(
  prioritizedHits: Array<{
    hits: Array<SearchHit<Record<string, unknown>>>;
    cap: number;
  }>,
  totalSize: number
): Array<SearchHit<Record<string, unknown>>> {
  const seen = new Set<string>();
  const result: Array<SearchHit<Record<string, unknown>>> = [];

  for (const { hits, cap } of prioritizedHits) {
    let added = 0;
    for (const hit of hits) {
      if (added >= cap || result.length >= totalSize) break;
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
