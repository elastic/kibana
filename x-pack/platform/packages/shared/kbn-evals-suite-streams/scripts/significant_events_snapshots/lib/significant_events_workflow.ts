/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Feature } from '@kbn/streams-schema';
import type { ConnectionConfig } from './get_connection_config';
import { kibanaRequest } from './kibana';
import { FEATURE_EXTRACTION_POLL_INTERVAL_MS, FEATURE_EXTRACTION_TIMEOUT_MS } from './constants';
import {
  getSigeventsSnapshotFeaturesIndex,
  SIGEVENTS_FEATURES_INDEX_PATTERN,
} from '../../../src/data_generators/sigevents_features_index';

export async function enableSignificantEvents(
  config: ConnectionConfig,
  log: ToolingLog
): Promise<void> {
  log.info('Enabling significant events...');
  const { status, data } = await kibanaRequest(
    config,
    'POST',
    '/api/kibana/settings/observability:streamsEnableSignificantEvents',
    { value: true }
  );

  if (status >= 200 && status < 300) {
    log.info('Significant events enabled');
    return;
  }

  throw new Error(`Failed to enable significant events: ${status} ${JSON.stringify(data)}`);
}

export async function triggerSigEventsFeatureExtraction(
  config: ConnectionConfig,
  log: ToolingLog,
  connectorId: string
): Promise<void> {
  log.info('Triggering feature extraction on stream "logs"...');

  const now = Date.now();
  const { status, data } = await kibanaRequest(
    config,
    'POST',
    '/internal/streams/logs/features/_task',
    {
      action: 'schedule',
      from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      to: new Date(now).toISOString(),
      connector_id: connectorId,
    }
  );

  if (status >= 200 && status < 300) {
    log.info('Scheduled the feature extraction task successfully');
    return;
  }

  throw new Error(`Failed to trigger feature extraction: ${status} ${JSON.stringify(data)}`);
}

export async function waitForSigEventsFeatureExtraction(
  config: ConnectionConfig,
  log: ToolingLog
): Promise<void> {
  log.info('Polling feature extraction status...');
  const deadline = Date.now() + FEATURE_EXTRACTION_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const { data } = await kibanaRequest(config, 'GET', '/internal/streams/logs/features/_status');

    const taskStatus = (data as Record<string, unknown>)?.status;

    if (taskStatus === 'completed') {
      log.info('Feature extraction completed successfully');
      return;
    }

    if (taskStatus === 'failed') {
      throw new Error(
        `Feature extraction failed: ${JSON.stringify((data as Record<string, unknown>)?.error)}`
      );
    }

    log.debug(`  status: ${taskStatus}`);
    await new Promise((resolve) => setTimeout(resolve, FEATURE_EXTRACTION_POLL_INTERVAL_MS));
  }

  throw new Error(
    `Feature extraction did not complete within ${FEATURE_EXTRACTION_TIMEOUT_MS / 1000}s`
  );
}

export async function logSigEventsExtractedFeatures(
  config: ConnectionConfig,
  log: ToolingLog
): Promise<void> {
  const features = await fetchSigEventsExtractedFeatures(config, log, 'logs');
  log.info(`Extracted ${features.length} features:`);
  for (const f of features) {
    log.info(`  - ${f.title || f.description} (${f.type})`);
  }
}

async function fetchSigEventsExtractedFeatures(
  config: ConnectionConfig,
  log: ToolingLog,
  streamName: string
): Promise<Feature[]> {
  const { data } = await kibanaRequest(config, 'GET', `/internal/streams/${streamName}/features`);
  const features = (data as Record<string, unknown>)?.features;
  if (!Array.isArray(features)) {
    throw new Error(`Expected "features" array from Kibana, got: ${JSON.stringify(data)}`);
  }
  return features.filter(Boolean) as Feature[];
}

export async function persistSigEventsExtractedFeaturesForSnapshot(
  config: ConnectionConfig,
  esClient: Client,
  log: ToolingLog,
  snapshotName: string,
  streamName: string = 'logs'
): Promise<{ index: string; count: number }> {
  const features = await fetchSigEventsExtractedFeatures(config, log, streamName);
  const index = getSigeventsSnapshotFeaturesIndex(snapshotName);

  await esClient.indices.delete({ index, ignore_unavailable: true });
  await esClient.indices.create({
    index,
    mappings: {
      dynamic: false,
      properties: {
        uuid: { type: 'keyword' },
        id: { type: 'keyword' },
        stream_name: { type: 'keyword' },
        type: { type: 'keyword' },
        subtype: { type: 'keyword' },
        title: { type: 'keyword' },
        description: { type: 'text' },
        properties: { type: 'object', enabled: false },
        confidence: { type: 'float' },
        evidence: { type: 'keyword' },
        tags: { type: 'keyword' },
        meta: { type: 'object', enabled: false },
        status: { type: 'keyword' },
        last_seen: { type: 'date' },
        expires_at: { type: 'date' },
      },
    },
  });

  if (features.length > 0) {
    const operations = features.flatMap((feature) => [
      { index: { _index: index, _id: feature.uuid } },
      feature,
    ]);

    await esClient.bulk({ refresh: true, operations });
  } else {
    try {
      await esClient.indices.refresh({ index });
    } catch (error) {
      throw new Error(
        `Failed to refresh features index "${index}" before snapshotting: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  log.info(`Persisted ${features.length} features to "${index}" for snapshotting`);
  return { index, count: features.length };
}

export async function cleanupSigEventsExtractedFeaturesData(
  esClient: Client,
  log: ToolingLog
): Promise<void> {
  log.info('Cleaning up ES data...');

  for (const target of ['logs*', '.kibana_streams_features', SIGEVENTS_FEATURES_INDEX_PATTERN]) {
    try {
      await esClient.indices.deleteDataStream({ name: target });
    } catch {
      // do nothing if the index doesn't exist
    }

    try {
      await esClient.deleteByQuery({ index: target, refresh: true, query: { match_all: {} } });
    } catch {
      // do nothing if the index doesn't exist
    }
  }
}

export async function disableStreams(config: ConnectionConfig, log: ToolingLog): Promise<void> {
  log.info('Disabling streams...');
  const { status } = await kibanaRequest(config, 'POST', '/api/streams/_disable');

  if (status < 200 || status >= 300) {
    log.warning(`Failed to disable streams (status ${status}), continuing...`);
  }
}
