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
import { MANAGED_STREAM_SEARCH_PATTERN, type KIFeatureExtractionScenario } from '../datasets';

const SAMPLE_DOCS_MAX = 50;
const MAX_BACKFILL_ATTEMPTS = 5;

const getAppNameFromFields = (fields: Record<string, unknown>): string | undefined => {
  const app = fields['resource.attributes.app'];
  if (Array.isArray(app)) {
    return app[0];
  }
  return undefined;
};

const extractRequiredAppsFromCriteria = (scenario: KIFeatureExtractionScenario): string[] => {
  const apps = new Set<string>();

  for (const criteria of scenario.output.criteria) {
    if (typeof criteria === 'string') continue;

    const id = (criteria as { id?: unknown }).id;
    if (typeof id !== 'string') continue;

    if (id.startsWith('entity-')) {
      apps.add(id.slice('entity-'.length));
      continue;
    }

    if (id.startsWith('dep-')) {
      const parts = id.slice('dep-'.length).split('-').filter(Boolean);
      for (const part of parts) apps.add(part);
    }
  }

  return [...apps].filter(Boolean);
};

const addUniqueHitsToSample = ({
  hits,
  docs,
  seen,
  uniqueApps,
}: {
  hits: Array<SearchHit<Record<string, unknown>>>;
  docs: Array<SearchHit<Record<string, unknown>>>;
  seen: Set<string>;
  uniqueApps: Set<string>;
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

    const app = getAppNameFromFields(hit.fields);
    if (app) {
      uniqueApps.add(app);
    }

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
  const uniqueApps = new Set<string>();
  const seen = new Set<string>();
  const requiredApps = extractRequiredAppsFromCriteria(scenario);

  const requiredAppResults = await Promise.all(
    requiredApps.map((app) =>
      getSampleDocuments({
        esClient,
        index: MANAGED_STREAM_SEARCH_PATTERN,
        start: 0,
        end: Date.now(),
        filter: [...query, { term: { 'resource.attributes.app': app } }],
        size: 1,
      })
    )
  );

  addUniqueHitsToSample({
    hits: requiredAppResults.flatMap(({ hits }) => hits),
    docs,
    seen,
    uniqueApps,
  });

  // fill remaining capacity with random documents.
  // limit attempts to avoid infinite loops in case of small pool of documents.
  let attempts = 0;
  while (docs.length < SAMPLE_DOCS_MAX && attempts < MAX_BACKFILL_ATTEMPTS) {
    const { hits } = await getSampleDocuments({
      esClient,
      index: MANAGED_STREAM_SEARCH_PATTERN,
      start: 0,
      end: Date.now(),
      filter: query,
      size: SAMPLE_DOCS_MAX - docs.length,
    });

    addUniqueHitsToSample({ hits, docs, seen, uniqueApps });
    attempts++;
  }

  log.info(
    `Collected ${docs.length} sample document(s) across ${uniqueApps.size} app(s): ${[
      ...uniqueApps,
    ].join(', ')}`
  );

  const missingApps = requiredApps.filter((app) => !uniqueApps.has(app));
  if (missingApps.length > 0) {
    log.warning(
      `Sample is missing required app(s) from criteria: ${missingApps.join(
        ', '
      )} (criteria may not be satisfiable from available logs)`
    );
  }

  return docs;
};
