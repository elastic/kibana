/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { Client } from '@elastic/elasticsearch';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import { getSampleDocuments } from '@kbn/ai-tools';
import {
  MANAGED_STREAM_SEARCH_PATTERN,
  type KIFeatureExtractionScenario,
} from '../../src/datasets';

const SAMPLE_DOCS_MAX = 50;

const addUniqueHitsToSample = ({
  hits,
  docs,
  seen,
}: {
  hits: Array<SearchHit<Record<string, unknown>>>;
  docs: Array<SearchHit<Record<string, unknown>>>;
  seen: Set<string>;
}): void => {
  for (const hit of hits) {
    if (!hit._id || !hit.fields || isEmpty(hit.fields)) {
      continue;
    }

    if (seen.has(hit._id)) {
      continue;
    }

    seen.add(hit._id);
    docs.push(hit);

    if (docs.length >= SAMPLE_DOCS_MAX) {
      break;
    }
  }
};

export const collectSampleDocuments = async ({
  esClient,
  scenario,
  log,
}: {
  esClient: Client;
  scenario: KIFeatureExtractionScenario;
  log: ToolingLog;
}): Promise<Array<SearchHit<Record<string, unknown>>>> => {
  const query = scenario.input.log_query_filter ?? [{ match_all: {} }];

  const docs: Array<SearchHit<Record<string, unknown>>> = [];
  const seen = new Set<string>();
  const criteriaWithFilters = scenario.output.criteria.filter(
    (criterion) => (criterion.sampling_filters?.length ?? 0) > 0
  );

  const samplingFilterResults = await Promise.all(
    criteriaWithFilters.flatMap((criterion) => {
      const { sampling_filters = [], ...details } = criterion;

      return sampling_filters.map(async (filter) => {
        const { hits } = await getSampleDocuments({
          esClient,
          index: MANAGED_STREAM_SEARCH_PATTERN,
          start: 0,
          end: Date.now(),
          filter: [...query, filter],
          size: 1,
        });
        return { hits, criterion: details, filter };
      });
    })
  );

  const unmatchedFilters: string[] = [];
  const criterionHitCounts = new Map<string, number>();
  for (const { hits, criterion, filter } of samplingFilterResults) {
    const hit = hits[0];
    if (!hit) {
      unmatchedFilters.push(`[${criterion.id}] filter: ${JSON.stringify(filter)}`);
      continue;
    }
    criterionHitCounts.set(criterion.id, (criterionHitCounts.get(criterion.id) ?? 0) + 1);
    log.debug(`  [${criterion.id}] matched doc ${hit._id} via filter ${JSON.stringify(filter)}`);
  }

  if (unmatchedFilters.length > 0) {
    throw new Error(
      `sampling_filters returned no documents for ${unmatchedFilters.length} filter(s) on a predefined dataset. ` +
        `This indicates a mismatch between the criteria filters and the snapshot data:\n` +
        unmatchedFilters.map((f) => `  ${f}`).join('\n')
    );
  }

  const totalFilterHits = samplingFilterResults.reduce((sum, { hits }) => sum + hits.length, 0);
  addUniqueHitsToSample({
    hits: samplingFilterResults.flatMap(({ hits }) => hits),
    docs,
    seen,
  });
  const criteriaCount = docs.length;
  const duplicateCount = totalFilterHits - criteriaCount;
  if (duplicateCount > 0) {
    log.debug(
      `${duplicateCount} duplicate doc(s) skipped across criteria filters (multiple filters matched the same document)`
    );
  }

  let generalFillCount = 0;
  if (docs.length < SAMPLE_DOCS_MAX) {
    const remaining = SAMPLE_DOCS_MAX - docs.length;
    const { hits } = await getSampleDocuments({
      esClient,
      index: MANAGED_STREAM_SEARCH_PATTERN,
      start: 0,
      end: Date.now(),
      filter: [...query, { bool: { must_not: [{ ids: { values: [...seen] } }] } }],
      size: remaining,
    });

    const beforeFill = docs.length;
    addUniqueHitsToSample({ hits, docs, seen });
    generalFillCount = docs.length - beforeFill;
  }

  const criteriaDistribution = [...criterionHitCounts.entries()]
    .map(([id, count]) => `${id}:${count}`)
    .join(', ');

  log.info(
    `Collected ${docs.length} sample document(s) ` +
      `(${criteriaCount} from ${criterionHitCounts.size} criteria, ${generalFillCount} general fill). ` +
      `Per-criterion: ${criteriaDistribution}`
  );

  return docs;
};
