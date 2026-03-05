/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { FieldValue, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import { MANAGED_STREAM_SEARCH_PATTERN, type FeatureExtractionScenario } from '../datasets';

const SAMPLE_DOCS_TARGET_UNIQUE_APPS = 8;
const SAMPLE_DOCS_MAX = 60;
const SAMPLE_DOCS_PAGE_SIZE = 50;
const REQUIRED_APP_SAMPLE_SIZE = 10;

const getAppNameFromLogDoc = (doc: Record<string, unknown>): string | undefined => {
  const resource = doc.resource as Record<string, unknown> | undefined;
  const attributes = resource?.attributes as Record<string, unknown> | undefined;
  // Check both OTel Demo convention (resource.attributes.app) and standard OTEL
  // (resource.attributes.service.name stored as a dotted key in the attributes object).
  const app = attributes?.app ?? attributes?.['service.name'];
  return typeof app === 'string' && app.length > 0 ? app : undefined;
};

const extractRequiredAppsFromCriteria = (scenario: FeatureExtractionScenario): string[] => {
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

const docKey = (doc: Record<string, unknown>): string => {
  const ts = String(doc['@timestamp'] ?? '');
  const body = doc.body as Record<string, unknown> | undefined;
  const text = typeof body?.text === 'string' ? body.text : '';
  return `${ts}:${text.slice(0, 200)}`;
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
    const source = hit._source;
    if (!source) {
      continue;
    }

    const key = docKey(source);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    docs.push(hit);

    const app = getAppNameFromLogDoc(source);
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
  scenario: FeatureExtractionScenario;
  log: ToolingLog;
}): Promise<Array<SearchHit<Record<string, unknown>>>> => {
  const query = scenario.input.log_query_filter ?? { match_all: {} };

  const docs: Array<SearchHit<Record<string, unknown>>> = [];
  const uniqueApps = new Set<string>();
  const seen = new Set<string>();

  let searchAfter: FieldValue[] | undefined;

  while (docs.length < SAMPLE_DOCS_MAX && uniqueApps.size < SAMPLE_DOCS_TARGET_UNIQUE_APPS) {
    const searchResult = await esClient.search<Record<string, unknown>>({
      index: MANAGED_STREAM_SEARCH_PATTERN,
      size: SAMPLE_DOCS_PAGE_SIZE,
      query,
      sort: [{ '@timestamp': { order: 'desc' } }, { _shard_doc: { order: 'desc' } }],
      ...(searchAfter ? { search_after: searchAfter } : {}),
    });

    const hits = searchResult.hits.hits;
    if (hits.length === 0) {
      break;
    }

    addUniqueHitsToSample({ hits, docs, seen, uniqueApps });

    searchAfter = hits.at(-1)?.sort as FieldValue[] | undefined;
    if (!searchAfter) {
      break;
    }
  }

  const requiredApps = extractRequiredAppsFromCriteria(scenario);
  const missingRequiredApps = requiredApps.filter((app) => !uniqueApps.has(app));
  if (missingRequiredApps.length > 0 && docs.length < SAMPLE_DOCS_MAX) {
    log.debug(`Missing required apps in sample: ${missingRequiredApps.join(', ')}`);
  }

  for (const app of missingRequiredApps) {
    if (docs.length >= SAMPLE_DOCS_MAX) break;

    const remaining = SAMPLE_DOCS_MAX - docs.length;
    const size = Math.min(REQUIRED_APP_SAMPLE_SIZE, remaining);

    const result = await esClient.search<Record<string, unknown>>({
      index: MANAGED_STREAM_SEARCH_PATTERN,
      size,
      query: {
        bool: {
          should: [
            // OTel Demo convention
            { term: { 'resource.attributes.app': app } },
            // Standard OTEL convention (service.name is a dotted key in the attributes map)
            { term: { 'resource.attributes.service.name.keyword': app } },
          ],
          minimum_should_match: 1,
        },
      },
      sort: [{ '@timestamp': { order: 'desc' } }, { _shard_doc: { order: 'desc' } }],
    });

    addUniqueHitsToSample({ hits: result.hits.hits, docs, seen, uniqueApps });
  }

  log.info(
    `Collected ${docs.length} sample document(s) across ${uniqueApps.size} app(s): ${[
      ...uniqueApps,
    ].join(', ')}`
  );

  const remainingMissingApps = requiredApps.filter((app) => !uniqueApps.has(app));
  if (remainingMissingApps.length > 0) {
    log.warning(
      `Sample is missing required app(s) from criteria: ${remainingMissingApps.join(
        ', '
      )} (criteria may not be satisfiable from available logs)`
    );
  }

  return docs;
};
