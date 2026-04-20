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
import { getEntityFilters } from './get_entity_filters';
import { parseError } from '../../../streams/errors/parse_error';

const EMPTY_SAMPLE: { hits: Array<SearchHit<Record<string, unknown>>> } = { hits: [] };

type SamplingStrategy = 'entity-filtered' | 'diverse' | 'random';

export async function fetchSampleDocuments({
  esClient,
  index,
  start,
  end,
  features,
  logger,
  size,
  entityFilteredRatio,
  diverseRatio,
  maxEntityFilters,
  diverseOffset = 0,
}: {
  esClient: ElasticsearchClient;
  index: string;
  start: number;
  end: number;
  features: FeatureWithFilter[];
  logger: Logger;
  size: number;
  entityFilteredRatio: number;
  diverseRatio: number;
  diverseOffset?: number;
  maxEntityFilters: number;
}) {
  const entityFilters = getEntityFilters(features, maxEntityFilters);

  if (entityFilters.length === 0) {
    const diverseSize = Math.round(size * diverseRatio);

    const [{ hits: diverseHits }, { hits: randomHits }] = await Promise.all([
      diverseSize > 0
        ? getDiverseSampleDocuments({
            esClient,
            index,
            start,
            end,
            size: diverseSize,
            offset: diverseOffset,
          }).catch((err) => {
            logger.warn(`Diverse sampling query failed: ${parseError(err).message}`);
            return EMPTY_SAMPLE;
          })
        : Promise.resolve(EMPTY_SAMPLE),
      getSampleDocuments({ esClient, index, start, end, size }),
    ]);

    const { documents, bucketCounts } = mergeDocuments(
      [
        { hits: diverseHits, cap: diverseSize, label: 'diverse' },
        { hits: randomHits, cap: size, label: 'random' },
      ],
      size
    );

    logger.debug(
      () =>
        `Sampled ${documents.length} documents (${bucketCounts.diverse} diverse, ${bucketCounts.random} random). No entities available to filter by.`
    );

    return {
      documents,
      totalFilters: 0,
      filtersCapped: false,
      hasFilteredDocuments: false,
      nextOffset: diverseOffset + diverseHits.length,
    };
  }

  const runtimeMappings = await getRuntimeMappings(esClient, index, entityFilters);
  const entityFilteredSize = Math.round(size * entityFilteredRatio);
  const diverseSize = Math.round(size * diverseRatio);

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
      diverseSize > 0
        ? getDiverseSampleDocuments({
            esClient,
            index,
            start,
            end,
            size: diverseSize + entityFilteredSize,
            offset: diverseOffset,
          }).catch((err) => {
            logger.warn(`Diverse sampling query failed: ${parseError(err).message}`);
            return EMPTY_SAMPLE;
          })
        : Promise.resolve(EMPTY_SAMPLE),
      getSampleDocuments({
        esClient,
        index,
        start,
        end,
        size,
      }),
    ]);

  const { documents, bucketCounts } = mergeDocuments(
    [
      { hits: entityFilteredHits, cap: entityFilteredSize, label: 'entity-filtered' },
      { hits: diverseHits, cap: diverseSize, label: 'diverse' },
      { hits: randomHits, cap: size, label: 'random' },
    ],
    size
  );

  logger.debug(
    () =>
      `Sampled ${documents.length} documents (${bucketCounts['entity-filtered']} entity-filtered, ${
        bucketCounts.diverse
      } diverse, ${bucketCounts.random} random). ${entityFilters.length} entity filters applied (${
        features.length - entityFilters.length
      } omitted):\n${JSON.stringify(entityFilters)}`
  );

  return {
    documents,
    totalFilters: features.length,
    filtersCapped: features.length > maxEntityFilters,
    hasFilteredDocuments: entityFilteredHits.length > 0,
    nextOffset: diverseOffset + Math.min(diverseHits.length, diverseSize),
  };
}

function mergeDocuments(
  prioritizedHits: Array<{
    hits: Array<SearchHit<Record<string, unknown>>>;
    cap: number;
    label: SamplingStrategy;
  }>,
  totalSize: number
): {
  documents: Array<SearchHit<Record<string, unknown>>>;
  bucketCounts: Record<SamplingStrategy, number>;
} {
  const seen = new Set<string>();
  const result: Array<SearchHit<Record<string, unknown>>> = [];
  const bucketCounts = { 'entity-filtered': 0, diverse: 0, random: 0 };

  for (let i = 0; i < prioritizedHits.length; i++) {
    const { hits, cap, label } = prioritizedHits[i];
    let added = 0;
    for (const hit of hits) {
      if (added >= cap || result.length >= totalSize) break;
      if (hit._id && seen.has(hit._id)) continue;
      if (hit._id) seen.add(hit._id);
      result.push(hit);
      added++;
    }
    bucketCounts[label] = added;
  }

  return { documents: result, bucketCounts };
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
