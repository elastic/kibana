/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  createDataStream,
  deleteDataStream,
  deleteIndexTemplate,
  putIndexTemplate,
} from '../../infra/elasticsearch';
import {
  getExtractionRunsDataStreamName,
  getSystemEventsDataStreamName,
} from '../../../common/domain/system_events';
import { getErrorMessage } from '../../../common';
import { resolveLatestEntitiesIndexName } from '../asset_manager/resolve_entity_store_indices';
import {
  getExtractionRunsIndexTemplateConfig,
  getExtractionRunsIndexTemplateId,
  getSystemEventsIndexTemplateConfig,
  getSystemEventsIndexTemplateId,
} from './system_events_index_templates';

const getStreams = (namespace: string) => [
  {
    dataStream: getExtractionRunsDataStreamName(namespace),
    template: getExtractionRunsIndexTemplateConfig(namespace),
  },
  {
    dataStream: getSystemEventsDataStreamName(namespace),
    template: getSystemEventsIndexTemplateConfig(namespace),
  },
];

const isPlainIndex = async (esClient: ElasticsearchClient, name: string): Promise<boolean> => {
  const { data_streams: dataStreams = [] } = await esClient.indices.getDataStream(
    { name },
    { ignore: [404] }
  );
  if (dataStreams.some((dataStream) => dataStream.name === name)) {
    return false;
  }
  return esClient.indices.exists({ index: name });
};

/**
 * Puts both system events index templates and creates both data streams. Repairs a plain
 * index that occupies a stream name. Idempotent.
 */
export const installSystemEventsStreams = async (
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
): Promise<void> => {
  for (const { dataStream, template } of getStreams(namespace)) {
    await putIndexTemplate(esClient, template);
    if (await isPlainIndex(esClient, dataStream)) {
      logger.warn(`Plain index found at data stream name ${dataStream}; recreating it`);
      await esClient.indices.delete({ index: dataStream });
    }
    await createDataStream(esClient, dataStream, { throwIfExists: false });
  }
};

/** Deletes both system events data streams and their index templates. */
export const uninstallSystemEventsStreams = async (
  esClient: ElasticsearchClient,
  namespace: string
): Promise<void> => {
  ensuredNamespaces.delete(namespace);
  await Promise.all([
    deleteDataStream(esClient, getExtractionRunsDataStreamName(namespace)),
    deleteDataStream(esClient, getSystemEventsDataStreamName(namespace)),
  ]);
  await Promise.all([
    deleteIndexTemplate(esClient, getExtractionRunsIndexTemplateId(namespace)),
    deleteIndexTemplate(esClient, getSystemEventsIndexTemplateId(namespace)),
  ]);
};

// Process-wide guard so the streams are ensured at most once per namespace per Kibana process.
const ensuredNamespaces = new Set<string>();

/**
 * Installs the streams at most once per namespace per process, and only while Entity Store is
 * installed: a run that ends after uninstall must not recreate the streams. Returns false when
 * the streams may be missing, so the caller can skip the write.
 */
export const ensureSystemEventsStreamsOnce = async (
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
): Promise<boolean> => {
  if (ensuredNamespaces.has(namespace)) {
    return true;
  }
  try {
    const latestIndex = await resolveLatestEntitiesIndexName(esClient, namespace);
    if (!(await esClient.indices.exists({ index: latestIndex }))) {
      logger.debug(`Entity store is not installed in "${namespace}"; skipping system events`);
      return false;
    }
    await installSystemEventsStreams(esClient, namespace, logger);
    ensuredNamespaces.add(namespace);
    return true;
  } catch (error) {
    logger.warn(
      `Failed to ensure system events streams for "${namespace}": ${getErrorMessage(error)}`
    );
    return false;
  }
};

// Test-only: clears the process-wide guard so cases start from a clean slate.
export const resetEnsuredSystemEventsNamespaces = (): void => {
  ensuredNamespaces.clear();
};
