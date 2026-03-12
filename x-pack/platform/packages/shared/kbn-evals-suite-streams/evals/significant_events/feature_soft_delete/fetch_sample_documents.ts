/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import { MANAGED_STREAM_SEARCH_PATTERN } from '../datasets';

export async function fetchSampleDocuments({
  esClient,
  sampleSize,
  log,
}: {
  esClient: Client;
  sampleSize: number;
  log: ToolingLog;
}): Promise<Array<SearchHit<Record<string, unknown>>>> {
  const result = await esClient.search<Record<string, unknown>>({
    index: MANAGED_STREAM_SEARCH_PATTERN,
    size: sampleSize,
    query: { match_all: {} },
    sort: [{ '@timestamp': { order: 'desc' } }],
  });

  const sampleDocuments = result.hits.hits;
  log.info(
    `Fetched ${sampleDocuments.length} sample documents from ${MANAGED_STREAM_SEARCH_PATTERN}`
  );

  if (sampleDocuments.length === 0) {
    throw new Error(
      `No sample documents found in ${MANAGED_STREAM_SEARCH_PATTERN}. Ensure the snapshot has been replayed.`
    );
  }

  return sampleDocuments;
}
