/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ENTITY_LATEST,
  ENTITY_METADATA,
  ENTITY_SCHEMA_VERSION_V2,
  ENTITY_UPDATES,
  getEntitiesAlias,
  getLatestEntitiesIndexName,
  getLegacySecurityEntityIndexPattern,
  getLegacySecurityLatestEntitiesIndexName,
} from '../../../common/domain/entity_index';
import { ALL_ENTITY_TYPES } from '../../../common/domain/definitions/entity_schema';
import {
  createDataStream,
  createIndex,
  deleteComponentTemplate,
  deleteDataStream,
  deleteIndex,
  deleteIndexTemplate,
  reindex,
} from '../../infra/elasticsearch';
import {
  getLegacySecurityComponentTemplateName,
  getLegacySecurityUpdatesComponentTemplateName,
} from './component_templates';
import { getLegacySecurityLatestIndexTemplateId } from './latest_index_template';
import { getLegacySecurityLatestIndexIngestPipelineId } from './latest_index_ingest_pipeline';
import { getLegacySecurityMetadataComponentTemplateName } from './metadata_component_templates';
import { getLegacySecurityMetadataIndexTemplateId } from './metadata_index_template';
import { getLegacySecurityMetadataIndexIngestPipelineId } from './metadata_index_ingest_pipeline';
import { getLegacySecurityUpdatesIndexTemplateId } from './updates_index_template';
import { getLegacySecurityHistorySnapshotIndexTemplateId } from './history_snapshot_index_template';
import { getUpdatesEntitiesDataStreamName } from './updates_data_stream';
import { getMetadataEntitiesDataStreamName } from './metadata_data_stream';

interface MigrateLegacySecurityAssetsOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
}

const getLegacyUpdatesDataStreamName = (namespace: string) =>
  getLegacySecurityEntityIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V2,
    dataset: ENTITY_UPDATES,
    namespace,
  });

const getLegacyMetadataDataStreamName = (namespace: string) =>
  getLegacySecurityEntityIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V2,
    dataset: ENTITY_METADATA,
    namespace,
  });

const indexOrDataStreamExists = async (
  esClient: ElasticsearchClient,
  name: string
): Promise<boolean> => {
  try {
    return await esClient.indices.exists({ index: name });
  } catch {
    return false;
  }
};

/**
 * Returns true when any Security-scoped v2 entity-store assets still exist for the
 * namespace (pre platform / shared-index rename).
 */
export async function hasLegacySecurityAssets(
  esClient: ElasticsearchClient,
  namespace: string
): Promise<boolean> {
  const candidates = [
    getLegacySecurityLatestEntitiesIndexName(namespace),
    getLegacyUpdatesDataStreamName(namespace),
    getLegacyMetadataDataStreamName(namespace),
  ];
  for (const name of candidates) {
    if (await indexOrDataStreamExists(esClient, name)) {
      return true;
    }
  }
  return false;
}

/**
 * Migrates Security-scoped `.entities.v2.*.security_{namespace}` assets to the
 * solution-neutral `.entities.v2.*.{namespace}` names. Safe to call when no legacy
 * assets exist (no-op). New templates/pipelines must already be installed.
 */
export async function migrateLegacySecurityAssets({
  esClient,
  logger,
  namespace,
}: MigrateLegacySecurityAssetsOptions): Promise<void> {
  const log = logger.get('migrate_legacy_security_assets');

  if (!(await hasLegacySecurityAssets(esClient, namespace))) {
    log.debug(`No legacy security-scoped entity store assets found in ${namespace}`);
    return;
  }

  log.info(`Migrating legacy security-scoped entity store assets in ${namespace}`);

  await migrateLatestIndex({ esClient, logger: log, namespace });
  await migrateUpdatesDataStream({ esClient, logger: log, namespace });
  await migrateMetadataDataStream({ esClient, logger: log, namespace });
  await cleanupLegacyTemplatesAndPipelines({ esClient, logger: log, namespace });

  log.info(`Finished migrating legacy security-scoped entity store assets in ${namespace}`);
}

async function migrateLatestIndex({
  esClient,
  logger,
  namespace,
}: MigrateLegacySecurityAssetsOptions): Promise<void> {
  const legacyIndex = getLegacySecurityLatestEntitiesIndexName(namespace);
  const newIndex = getLatestEntitiesIndexName(namespace);
  const alias = getEntitiesAlias(ENTITY_LATEST, namespace);

  const legacyExists = await indexOrDataStreamExists(esClient, legacyIndex);
  if (!legacyExists) {
    return;
  }

  const newExists = await indexOrDataStreamExists(esClient, newIndex);
  if (!newExists) {
    await createIndex(esClient, newIndex, { throwIfExists: false });
    logger.debug(`Created neutral latest index ${newIndex}`);
    await reindex(esClient, {
      source: { index: legacyIndex },
      dest: { index: newIndex },
    });
    logger.info(`Reindexed ${legacyIndex} → ${newIndex}`);
  }

  try {
    await esClient.indices.updateAliases({
      actions: [
        { remove: { index: legacyIndex, alias } },
        { add: { index: newIndex, alias } },
      ],
    });
  } catch (error) {
    // Alias may already point at the new index, or may not have existed on legacy.
    await esClient.indices.updateAliases({
      actions: [{ add: { index: newIndex, alias } }],
    });
    logger.debug(`Latest alias retarget fallback used: ${error}`);
  }

  await deleteIndex(esClient, legacyIndex);
  logger.debug(`Deleted legacy latest index ${legacyIndex}`);
}

async function migrateUpdatesDataStream({
  esClient,
  logger,
  namespace,
}: MigrateLegacySecurityAssetsOptions): Promise<void> {
  const legacyStream = getLegacyUpdatesDataStreamName(namespace);
  const newStream = getUpdatesEntitiesDataStreamName(namespace);

  if (!(await indexOrDataStreamExists(esClient, legacyStream))) {
    return;
  }

  // Updates is a short-retention extraction buffer — recreate under the new name.
  if (!(await indexOrDataStreamExists(esClient, newStream))) {
    await createDataStream(esClient, newStream, { throwIfExists: false });
  }
  await deleteDataStream(esClient, legacyStream);
  logger.debug(`Replaced legacy updates data stream ${legacyStream} with ${newStream}`);
}

async function migrateMetadataDataStream({
  esClient,
  logger,
  namespace,
}: MigrateLegacySecurityAssetsOptions): Promise<void> {
  const legacyStream = getLegacyMetadataDataStreamName(namespace);
  const newStream = getMetadataEntitiesDataStreamName(namespace);

  if (!(await indexOrDataStreamExists(esClient, legacyStream))) {
    return;
  }

  if (!(await indexOrDataStreamExists(esClient, newStream))) {
    await createDataStream(esClient, newStream, { throwIfExists: false });
    await reindex(esClient, {
      source: { index: legacyStream },
      dest: { index: newStream },
    });
    logger.info(`Reindexed metadata ${legacyStream} → ${newStream}`);
  }

  await deleteDataStream(esClient, legacyStream);
  logger.debug(`Deleted legacy metadata data stream ${legacyStream}`);
}

async function cleanupLegacyTemplatesAndPipelines({
  esClient,
  logger,
  namespace,
}: MigrateLegacySecurityAssetsOptions): Promise<void> {
  const componentTemplates = [
    ...ALL_ENTITY_TYPES.flatMap((type) => [
      getLegacySecurityComponentTemplateName(type, namespace),
      getLegacySecurityUpdatesComponentTemplateName(type, namespace),
    ]),
    getLegacySecurityMetadataComponentTemplateName(namespace),
  ];

  await Promise.all(
    componentTemplates.map(async (name) => {
      await deleteComponentTemplate(esClient, name);
      logger.debug(`Deleted legacy component template ${name}`);
    })
  );

  await Promise.all([
    deleteIndexTemplate(esClient, getLegacySecurityLatestIndexTemplateId(namespace)),
    deleteIndexTemplate(esClient, getLegacySecurityUpdatesIndexTemplateId(namespace)),
    deleteIndexTemplate(esClient, getLegacySecurityMetadataIndexTemplateId(namespace)),
    deleteIndexTemplate(esClient, getLegacySecurityHistorySnapshotIndexTemplateId(namespace)),
    esClient.ingest.deletePipeline(
      { id: getLegacySecurityLatestIndexIngestPipelineId(namespace) },
      { ignore: [404] }
    ),
    esClient.ingest.deletePipeline(
      { id: getLegacySecurityMetadataIndexIngestPipelineId(namespace) },
      { ignore: [404] }
    ),
  ]);
}
