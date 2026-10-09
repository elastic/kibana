/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  putComponentTemplate,
  putDataStreamMapping,
  rolloverDataStream,
  putIndexTemplate,
  createDataStream,
} from '../../infra/elasticsearch';
import {
  getMetadataComponentTemplate,
  getMetadataIndexMappings,
} from './metadata_component_templates';
import { getMetadataEntitiesDataStreamName } from './metadata_data_stream';
import { getMetadataEntityIndexTemplateConfig } from './metadata_index_template';
import { installMetadataIndexIngestPipeline } from './metadata_index_ingest_pipeline';

// Minimal shape of the errors surfaced by the ES client. Mirrors the detection
// style used elsewhere in infra/elasticsearch (e.g. createIndex/createDataStream).
interface EsErrorLike {
  statusCode?: number;
  meta?: {
    statusCode?: number;
    body?: { error?: { type?: string } };
  };
}

const errorType = (error: unknown): string | undefined =>
  (error as EsErrorLike)?.meta?.body?.error?.type;

const isIndexNotFound = (error: unknown): boolean => {
  const err = error as EsErrorLike;
  return (
    errorType(error) === 'index_not_found_exception' ||
    err?.meta?.statusCode === 404 ||
    err?.statusCode === 404
  );
};

// Elasticsearch reports an in-place mapping change that conflicts with an existing
// (often dynamically inferred) field type as an illegal_argument_exception.
const isMappingConflict = (error: unknown): boolean =>
  errorType(error) === 'illegal_argument_exception';

// Returns true when a plain (non-data-stream) index occupies the name that
// should belong to the metadata data stream. This can happen on deployments
// that were upgraded from a version that pre-dates the metadata data stream:
// if a write arrived after the upgrade but before the index template was
// installed, ES auto-created a regular index instead of a data stream.
const detectPlainIndex = async (esClient: ElasticsearchClient, name: string): Promise<boolean> => {
  try {
    await esClient.indices.getDataStream({ name });
    return false; // name resolves to a real data stream
  } catch (err) {
    if (!isIndexNotFound(err)) {
      throw err;
    }
  }
  // getDataStream 404'd — check if a plain index is occupying the name
  return esClient.indices.exists({ index: name });
};

/**
 * Ensures the metadata data stream and its backing ES assets exist and are
 * up to date with the current mappings.
 *
 * Why this exists: `installSharedElasticsearchAssets()` runs only during a fresh
 * `AssetManagerClient.init()`. The install route short-circuits when all entity
 * types are already present, so on upgrade of an existing deployment (e.g. from a
 * version that pre-dates the metadata data stream) the ingest pipeline, index
 * template, and data stream are never created. This function closes that gap by
 * (re-)installing each asset idempotently on the first metadata write.
 *
 * Strategy:
 *  - Install the ingest pipeline, component template, and index template — all
 *    idempotent PUTs, safe to re-run on every process boot.
 *  - Detect and repair corrupted state: if a plain index occupies the data
 *    stream name (written by ES auto-create before the index template existed),
 *    delete it and recreate as a proper data stream. The stream is append-only
 *    and regenerable, so data loss is acceptable.
 *  - PUT mappings in place on the existing data stream — no rollover needed in
 *    the common case.
 *  - If the data stream does not exist (fresh upgrade path), create it from the
 *    index template we just installed.
 *  - If the in-place update conflicts (a field was dynamically mapped with a
 *    different type during the pre-sync window), roll the data stream over so the
 *    new backing index picks up the correct types.
 */
export const ensureMetadataDataStreamMappings = async (
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
): Promise<void> => {
  // All three are idempotent PUTs — safe to repeat on every first write after
  // a Kibana restart. On fresh installs they already exist; on upgrades from a
  // version that pre-dates the metadata data stream they do not.
  await installMetadataIndexIngestPipeline(esClient, namespace, logger);
  await putComponentTemplate(esClient, getMetadataComponentTemplate(namespace));
  await putIndexTemplate(esClient, getMetadataEntityIndexTemplateConfig(namespace));

  const dataStream = getMetadataEntitiesDataStreamName(namespace);

  // Repair corrupted state: a plain index at the data stream name means ES
  // auto-created a regular index before the index template was installed on
  // this deployment. The stream is append-only and fully regenerable
  // (maintainers rewrite on their next run; AI summaries regenerate on demand),
  // so deleting the plain index and recreating as a data stream is safe.
  if (await detectPlainIndex(esClient, dataStream)) {
    logger.warn(
      `Plain index found at data stream name ${dataStream} ` +
        `(pre-template write auto-created a regular index); ` +
        `deleting and recreating as a data stream`
    );
    await esClient.indices.delete({ index: dataStream });
    await createDataStream(esClient, dataStream, { throwIfExists: false });
    logger.info(`Replaced corrupted plain index with data stream at ${dataStream}`);
    return;
  }

  try {
    await putDataStreamMapping(esClient, dataStream, getMetadataIndexMappings());
    logger.debug(`Synced metadata data stream mappings for namespace ${namespace}`);
  } catch (error) {
    if (isIndexNotFound(error)) {
      // Data stream does not exist — create it from the index template we just
      // installed. This is the upgrade path; on fresh installs the data stream
      // is already created by installIndicesAndDataStreams().
      await createDataStream(esClient, dataStream, { throwIfExists: false });
      logger.debug(`Created metadata data stream for namespace ${namespace}`);
      return;
    }
    if (isMappingConflict(error)) {
      logger.info(
        `In-place metadata mapping update conflicted for ${dataStream}; rolling over so a new backing index applies the current mappings`
      );
      await rolloverDataStream(esClient, dataStream);
      return;
    }
    throw error;
  }
};

// Process-wide guard so the sync runs at most once per namespace per Kibana
// process. The metadata client is constructed per request, so this cannot live
// on the client instance.
const ensuredNamespaces = new Set<string>();

/**
 * Runs {@link ensureMetadataDataStreamMappings} at most once per namespace per
 * process. Best-effort: a failure is logged but never thrown, because a metadata
 * write must not fail on account of a mapping sync (writes still succeed via
 * dynamic mapping). A failed attempt is not cached, so the next write retries.
 */
export const ensureMetadataDataStreamMappingsOnce = async (
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
): Promise<void> => {
  if (ensuredNamespaces.has(namespace)) {
    return;
  }
  try {
    await ensureMetadataDataStreamMappings(esClient, namespace, logger);
    ensuredNamespaces.add(namespace);
  } catch (error) {
    logger.warn(
      `Failed to sync metadata data stream mappings for namespace ${namespace}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

// Test-only: clears the process-wide guard so cases start from a clean slate.
export const resetEnsuredMetadataNamespaces = (): void => {
  ensuredNamespaces.clear();
};
