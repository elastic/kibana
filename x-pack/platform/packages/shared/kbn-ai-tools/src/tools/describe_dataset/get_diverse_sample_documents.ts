/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MappingRuntimeFields,
  QueryDslQueryContainer,
  SearchHit,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { dateRangeQuery } from '@kbn/es-query';
import { castArray } from 'lodash';
import { getSampleDocuments } from './get_sample_documents';

const MESSAGE_FIELD_CANDIDATES = ['message', 'body.text'];
const MAX_DOCS_TO_SAMPLE = 100_000;

interface CategoryBucket {
  doc_count: number;
  docs: { hits: { hits: Array<SearchHit<Record<string, unknown>>> } };
}

interface GetDiverseSampleDocumentsOptions {
  esClient: ElasticsearchClient;
  index: string;
  start: number;
  end: number;
  size?: number;
  filter?: QueryDslQueryContainer | QueryDslQueryContainer[];
  runtime_mappings?: MappingRuntimeFields;
  timeout?: string;
}

export async function getDiverseSampleDocuments({
  esClient,
  index,
  start,
  end,
  size = 100,
  filter,
  runtime_mappings,
  timeout = '10s',
}: GetDiverseSampleDocumentsOptions): Promise<{ hits: Array<SearchHit<Record<string, unknown>>> }> {
  const timeRangeFilter = dateRangeQuery(start, end);
  const combinedFilter = [...timeRangeFilter, ...castArray(filter ?? [])];
  const sampleDocOpts = { esClient, index, start, end, size, filter, runtime_mappings, timeout };

  const [messageField, totalDocs] = await Promise.all([
    detectMessageField({ esClient, index, timeRangeFilter }),
    countDocs({ esClient, index, combinedFilter }),
  ]);

  if (!messageField || totalDocs === 0) {
    return totalDocs === 0 ? { hits: [] } : getSampleDocuments(sampleDocOpts);
  }

  let samplingProbability = MAX_DOCS_TO_SAMPLE / totalDocs;
  if (samplingProbability >= 0.5) {
    samplingProbability = 1;
  }

  let buckets: CategoryBucket[];
  try {
    const response = await esClient.search({
      index,
      size: 0,
      track_total_hits: false,
      timeout,
      runtime_mappings,
      query: { bool: { filter: combinedFilter } },
      aggregations: {
        sampler: {
          random_sampler: { probability: samplingProbability },
          aggs: {
            categories: {
              categorize_text: {
                field: messageField,
                size,
                min_doc_count: 1,
              },
              aggs: {
                docs: {
                  top_hits: {
                    size: 1,
                    _source: false,
                    fields: [{ field: '*', include_unmapped: true }],
                  },
                },
              },
            },
          },
        },
      },
    });

    const sampler = response.aggregations?.sampler as
      | { categories: { buckets: CategoryBucket[] } }
      | undefined;

    buckets = sampler?.categories?.buckets ?? [];
  } catch {
    return getSampleDocuments(sampleDocOpts);
  }

  if (buckets.length === 0) {
    return getSampleDocuments(sampleDocOpts);
  }

  // 1 representative doc per category
  const categoryHits = buckets
    .map((bucket) => bucket.docs.hits.hits[0])
    .filter((hit): hit is SearchHit<Record<string, unknown>> => Boolean(hit?._id));

  // Pad with random samples if categories < target
  const remaining = size - categoryHits.length;
  if (remaining <= 0) {
    return { hits: categoryHits.slice(0, size) };
  }

  // Over-fetch to compensate for duplicates that will be removed during dedup
  const randomSamples = await getSampleDocuments({
    ...sampleDocOpts,
    size: remaining + categoryHits.length,
  });

  const categoryIdSet = new Set(categoryHits.map((hit) => hit._id));
  const dedupedRandomHits = randomSamples.hits.filter(
    (hit) => !hit._id || !categoryIdSet.has(hit._id)
  );

  return { hits: [...categoryHits, ...dedupedRandomHits].slice(0, size) };
}

async function detectMessageField({
  esClient,
  index,
  timeRangeFilter,
}: {
  esClient: ElasticsearchClient;
  index: string;
  timeRangeFilter: ReturnType<typeof dateRangeQuery>;
}): Promise<string | undefined> {
  const fieldCapsResponse = await esClient.fieldCaps({
    index,
    fields: MESSAGE_FIELD_CANDIDATES,
    index_filter: {
      bool: {
        filter: timeRangeFilter,
      },
    },
    types: ['text', 'match_only_text'],
  });

  const fieldsFound = Object.keys(fieldCapsResponse.fields);

  for (const candidate of MESSAGE_FIELD_CANDIDATES) {
    if (fieldsFound.includes(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function countDocs({
  esClient,
  index,
  combinedFilter,
}: {
  esClient: ElasticsearchClient;
  index: string;
  combinedFilter: QueryDslQueryContainer[];
}): Promise<number> {
  const response = await esClient.count({
    index,
    query: { bool: { filter: combinedFilter } },
  });

  return response.count;
}
