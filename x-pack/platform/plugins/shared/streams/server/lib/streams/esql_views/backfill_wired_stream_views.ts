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
  LOGS_ECS_STREAM_NAME,
  LOGS_OTEL_STREAM_NAME,
  Streams,
} from '@kbn/streams-schema';
import { processInDepthOrder } from '../helpers/process_in_depth_order';
import { createStreamsStorageClient } from '../storage/streams_storage_client';
import { getEsqlView, upsertEsqlView } from './manage_esql_views';

const MANDATORY_STREAM_NAMES = [LOGS_OTEL_STREAM_NAME, LOGS_ECS_STREAM_NAME] as const;

async function sentinelViewsExist({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<boolean> {
  const results = await Promise.all(
    MANDATORY_STREAM_NAMES.map(async (streamName) => {
      try {
        await getEsqlView({ esClient, logger, name: getEsqlViewName(streamName) });
        return true;
      } catch {
        return false;
      }
    })
  );
  return results.every(Boolean);
}

/**
 * Backfills ES|QL views for all wired streams that are missing them.
 *
 * Mandatory stream check: if both $.logs.otel and $.logs.ecs views already exist, we consider
 * the cluster up-to-date and skip the backfill entirely.
 */
export async function backfillWiredStreamViews({
  esClient,
  logger,
  isServerless,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  isServerless: boolean;
}): Promise<void> {
  if (isServerless) {
    logger.debug('ES|QL views are not supported in serverless mode, skipping view backfill.');
    return;
  }

  const viewsAlreadyExist = await sentinelViewsExist({ esClient, logger });
  if (viewsAlreadyExist) {
    logger.debug('Wired stream ES|QL views already exist, skipping startup backfill.');
    return;
  }

  logger.info(
    'Wired stream ES|QL views are missing. Running startup backfill to create them for all existing streams.'
  );

  const storageClient = createStreamsStorageClient(esClient, logger);

  let streamsSearchResponse;
  try {
    streamsSearchResponse = await storageClient.search({
      size: 10000,
      sort: [{ name: 'asc' }],
      track_total_hits: false,
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      logger.debug(
        'Streams storage index (.kibana_streams) not found — streams not yet enabled, skipping view backfill.'
      );
      return;
    }
    throw error;
  }

  const wiredStreams = streamsSearchResponse.hits.hits
    .map((hit) => hit._source)
    .filter((def): def is Streams.WiredStream.Definition => Streams.WiredStream.Definition.is(def));

  if (wiredStreams.length === 0) {
    logger.debug('No wired streams found in storage, nothing to backfill.');
    return;
  }

  logger.info(`Backfilling ES|QL views for ${wiredStreams.length} wired stream(s).`);

  await processInDepthOrder(
    wiredStreams,
    (def) => getSegments(def.name).length - 1,
    (def) => {
      const directChildren = (def.ingest.wired.routing ?? []).map((r) => r.destination);
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
