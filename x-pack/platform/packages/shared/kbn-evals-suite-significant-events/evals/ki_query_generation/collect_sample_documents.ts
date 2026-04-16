/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  MANAGED_STREAM_SEARCH_PATTERN,
  type KIFeatureExtractionScenario,
} from '../../src/datasets';

const SAMPLE_DOCS_SIZE = 500;
const SAMPLE_DOCS_PER_FILTER = 5;

const addUniqueHits = ({
  hits,
  docs,
  seen,
  limit,
}: {
  hits: Array<SearchHit<Record<string, unknown>>>;
  docs: Array<SearchHit<Record<string, unknown>>>;
  seen: Set<string>;
  limit: number;
}): void => {
  for (const hit of hits) {
    if (docs.length >= limit) {
      break;
    }
    if (!hit._id) {
      continue;
    }
    if (seen.has(hit._id)) {
      continue;
    }
    seen.add(hit._id);
    docs.push(hit);
  }
};

/**
 * Collects sample documents for KI query generation evaluation using
 * criteria-driven sampling from the matching feature extraction scenario.
 *
 * For each `sampling_filter` in the extraction scenario's criteria,
 * fetches a small number of docs to ensure coverage of every
 * entity/service/dependency. Remaining slots are filled with general
 * docs up to `SAMPLE_DOCS_SIZE`.
 *
 * Falls back to a plain recency-based search when no extraction scenario
 * or no `sampling_filters` are available.
 */
export const collectSampleDocuments = async ({
  esClient,
  extractionScenario,
  log,
}: {
  esClient: Client;
  extractionScenario?: KIFeatureExtractionScenario;
  log: ToolingLog;
}): Promise<Array<SearchHit<Record<string, unknown>>>> => {
  const baseQuery: QueryDslQueryContainer[] = extractionScenario?.input.log_query_filter ?? [
    { match_all: {} },
  ];

  const docs: Array<SearchHit<Record<string, unknown>>> = [];
  const seen = new Set<string>();

  const criteriaWithFilters = (extractionScenario?.output.criteria ?? []).filter(
    (criterion) => (criterion.sampling_filters?.length ?? 0) > 0
  );

  if (criteriaWithFilters.length > 0) {
    const filterResults = await Promise.all(
      criteriaWithFilters.flatMap((criterion) => {
        const { sampling_filters: samplingFilters = [] } = criterion;

        return samplingFilters.map(async (filter) => {
          const result = await esClient.search<Record<string, unknown>>({
            index: MANAGED_STREAM_SEARCH_PATTERN,
            size: SAMPLE_DOCS_PER_FILTER,
            query: { bool: { filter: [...baseQuery, filter] } },
            sort: [{ '@timestamp': { order: 'desc' } }],
          });
          return { hits: result.hits.hits, criterionId: criterion.id, filter };
        });
      })
    );

    const unmatchedFilters: string[] = [];
    const criterionHitCounts = new Map<string, number>();
    for (const { hits, criterionId, filter } of filterResults) {
      if (hits.length === 0) {
        unmatchedFilters.push(`[${criterionId}] filter: ${JSON.stringify(filter)}`);
        continue;
      }
      criterionHitCounts.set(criterionId, (criterionHitCounts.get(criterionId) ?? 0) + hits.length);
    }

    if (unmatchedFilters.length > 0) {
      throw new Error(
        `sampling_filters returned no documents for ${unmatchedFilters.length} filter(s) on a predefined dataset. ` +
          `This indicates a mismatch between the criteria filters and the snapshot data:\n` +
          unmatchedFilters.map((f) => `  ${f}`).join('\n')
      );
    }

    const allFilterHits = filterResults.flatMap(({ hits }) => hits);
    addUniqueHits({ hits: allFilterHits, docs, seen, limit: SAMPLE_DOCS_SIZE });

    const criteriaDistribution = [...criterionHitCounts.entries()]
      .map(([id, count]) => `${id}:${count}`)
      .join(', ');

    log.info(
      `Criteria-driven sampling: ${docs.length} unique doc(s) from ${criterionHitCounts.size} criteria. ` +
        `Per-criterion: ${criteriaDistribution}`
    );
  }

  let generalFillCount = 0;
  if (docs.length < SAMPLE_DOCS_SIZE) {
    const remaining = SAMPLE_DOCS_SIZE - docs.length;
    const fillQuery: QueryDslQueryContainer =
      seen.size > 0
        ? { bool: { filter: baseQuery, must_not: [{ ids: { values: [...seen] } }] } }
        : { bool: { filter: baseQuery } };

    const fillResult = await esClient.search<Record<string, unknown>>({
      index: MANAGED_STREAM_SEARCH_PATTERN,
      size: remaining,
      query: fillQuery,
      sort: [{ '@timestamp': { order: 'desc' } }],
    });

    const beforeFill = docs.length;
    addUniqueHits({ hits: fillResult.hits.hits, docs, seen, limit: SAMPLE_DOCS_SIZE });
    generalFillCount = docs.length - beforeFill;
  }

  log.info(
    `Collected ${docs.length} sample document(s) ` +
      `(${docs.length - generalFillCount} from criteria, ${generalFillCount} general fill)`
  );

  return docs;
};
