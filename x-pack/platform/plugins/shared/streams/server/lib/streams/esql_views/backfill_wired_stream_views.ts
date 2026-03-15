/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNotFoundError } from '@kbn/es-errors';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  getEsqlViewName,
  getSegments,
  getWiredStreamViewQuery,
  ROOT_STREAM_NAMES,
  Streams,
} from '@kbn/streams-schema';
import { processInDepthOrder } from '../helpers/process_in_depth_order';
import { createStreamsStorageClient } from '../storage/streams_storage_client';
import { getEsqlView, upsertEsqlView } from './manage_esql_views';

async function enabledRootStreamsMissingViews({
  esClient,
  logger,
  enabledRootNames,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  enabledRootNames: string[];
}): Promise<boolean> {
  if (enabledRootNames.length === 0) {
    return false;
  }

  const results = await Promise.all(
    enabledRootNames.map(async (streamName) => {
      try {
        await getEsqlView({ esClient, logger, name: getEsqlViewName(streamName) });
        return false;
      } catch (error) {
        if (isNotFoundError(error)) {
          return true;
        }
        if (error instanceof Error && error.message.includes('not found')) {
          return true;
        }
        throw error;
      }
    })
  );
  return results.some(Boolean);
}

/**
 * Determines which ROOT_STREAM_NAMES exist as wired streams in storage.
 * Uses targeted single-document lookups instead of loading all streams.
 */
async function getEnabledRootNames({
  storageClient,
}: {
  storageClient: ReturnType<typeof createStreamsStorageClient>;
}): Promise<string[]> {
  const enabledRootNames: string[] = [];
  for (const name of ROOT_STREAM_NAMES) {
    try {
      const response = await storageClient.get({ id: name });
      if (response._source && Streams.WiredStream.Definition.is(response._source)) {
        enabledRootNames.push(name);
      }
    } catch (error) {
      if (isNotFoundError(error)) {
        continue;
      }
      throw error;
    }
  }
  return enabledRootNames;
}

/**
 * Backfills ES|QL views for all wired streams that are missing them.
 *
 * Uses a series of increasingly expensive checks to avoid unnecessary work:
 * 1. Check if .kibana_streams index exists (HEAD request)
 * 2. Check which root streams exist via targeted lookups (1-3 GET-by-ID)
 * 3. Check if those roots already have views (1-3 GET view)
 * 4. Only then load all wired streams for the actual backfill
 */
export async function backfillWiredStreamViews({
  esClient,
  logger,
  isWiredStreamViewsEnabled,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  isWiredStreamViewsEnabled: boolean;
}): Promise<void> {
  if (!isWiredStreamViewsEnabled) {
    logger.debug('Wired stream views are disabled, skipping view backfill.');
    return;
  }

  const storageClient = createStreamsStorageClient(esClient, logger);

  const indexExists = await storageClient.existsIndex();
  if (!indexExists) {
    logger.debug(
      'Streams storage index not found — streams not yet enabled, skipping view backfill.'
    );
    return;
  }

  const enabledRootNames = await getEnabledRootNames({ storageClient });
  if (enabledRootNames.length === 0) {
    logger.debug('No root streams found in storage, skipping view backfill.');
    return;
  }

  const hasMissingViews = await enabledRootStreamsMissingViews({
    esClient,
    logger,
    enabledRootNames,
  });

  if (!hasMissingViews) {
    logger.debug('All enabled root stream views already exist, skipping startup backfill.');
    return;
  }

  const streamsSearchResponse = await storageClient.search({
    size: 10000,
    sort: [{ name: 'asc' }],
    track_total_hits: false,
  });

  const wiredStreams = streamsSearchResponse.hits.hits
    .map((hit) => hit._source)
    .filter((def): def is Streams.WiredStream.Definition => Streams.WiredStream.Definition.is(def));

  if (wiredStreams.length === 0) {
    logger.debug('No wired streams found in storage, nothing to backfill.');
    return;
  }

  const wiredStreamNames = new Set(wiredStreams.map((def) => def.name));

  logger.info(
    `Some enabled root streams are missing ES|QL views. Backfilling views for ${wiredStreams.length} wired stream(s).`
  );

  await processInDepthOrder(
    wiredStreams,
    (def) => getSegments(def.name).length - 1,
    (def) => {
      const directChildren = (def.ingest.wired.routing ?? [])
        .map((r) => r.destination)
        .filter((dest) => wiredStreamNames.has(dest));
      return upsertEsqlView({
        esClient,
        logger,
        name: getEsqlViewName(def.name),
        query: getWiredStreamViewQuery(def.name, directChildren),
      });
    }
  );

  logger.info('Wired stream ES|QL view backfill completed successfully.');
}
