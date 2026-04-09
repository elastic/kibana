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

  addUniqueHitsToSample({
    hits: samplingFilterResults.flatMap(({ hits }) => hits),
    docs,
    seen,
  });

  if (docs.length < SAMPLE_DOCS_MAX) {
    const { hits } = await getSampleDocuments({
      esClient,
      index: MANAGED_STREAM_SEARCH_PATTERN,
      start: 0,
      end: Date.now(),
      filter: [...query, { bool: { must_not: [{ ids: { values: [...seen] } }] } }],
      size: SAMPLE_DOCS_MAX - docs.length,
    });

    addUniqueHitsToSample({ hits, docs, seen });
  }

  const samplingFiltersWithNoHits = samplingFilterResults.filter(({ hits }) => hits.length === 0);
  if (samplingFiltersWithNoHits.length > 0) {
    log.warning(
      `${samplingFiltersWithNoHits.length} sampling filters returned no matching document:\n
      ${samplingFiltersWithNoHits
        .map(({ criterion, filter }) => JSON.stringify({ criterion, filter }, null, 2))
        .join('\n')}`
    );
    return docs;
  }

  log.info(
    `Successfully collected ${docs.length} sample documents (${criteriaWithFilters.length} criteria with sampling filters)`
  );
  return docs;
};
