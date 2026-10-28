/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  putComponentTemplate,
  putIndexTemplate,
  createIndex,
  deleteIndex,
  createDataStream,
  deleteDataStream,
  deleteIndexTemplate,
  deleteComponentTemplate,
} from '../../infra/elasticsearch';
import { ALL_ENTITY_TYPES } from '../../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import { getLatestEntityIndexTemplateConfig } from './latest_index_template';
import {
  getLatestEntitiesIndexName,
  getLegacySecurityLatestEntitiesIndexName,
  getEntitiesAlias,
  ENTITY_LATEST,
} from '../../../common/domain/entity_index';
import {
  getEntityDefinitionComponentTemplate,
  getUpdatesComponentTemplateName,
} from './component_templates';
import { getHistorySnapshotIndexTemplateConfig } from './history_snapshot_index_template';
import {
  getHistorySnapshotIndexPattern,
  getLegacySecurityHistorySnapshotIndexPattern,
} from './history_snapshot_index';
import {
  getUpdatesEntitiesDataStreamName,
  getLegacySecurityUpdatesEntitiesDataStreamName,
  getLegacySecurityUpdatesIndexTemplateId,
  getUpdatesIndexTemplateId,
} from './updates_data_stream';
import { installLatestIndexIngestPipeline } from './latest_index_ingest_pipeline';
import { getMetadataComponentTemplate } from './metadata_component_templates';
import { getMetadataEntityIndexTemplateConfig } from './metadata_index_template';
import {
  getMetadataEntitiesDataStreamName,
  getLegacySecurityMetadataEntitiesDataStreamName,
} from './metadata_data_stream';
import { installMetadataIndexIngestPipeline } from './metadata_index_ingest_pipeline';
import {
  ensureLegacyCompatibilityAliases,
  hasCollidingNeutralNamespaceAssets,
  hasLegacySecurityAssets,
  migrateLegacySecurityAssets,
} from './migrate_legacy_security_assets';
import { resolveEntityStoreWriteTargets } from './resolve_entity_store_indices';

interface SharedElasticsearchAssetOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
}

interface InstallSharedElasticsearchAssetOptions extends SharedElasticsearchAssetOptions {
  /**
   * Client used for legacy→neutral migration (reindex/delete). Prefer the Kibana
   * internal user (like v1 cleanup) so upgrade/migration is not gated on the
   * requesting user's `manage` privileges on entity indices. Compatibility aliases
   * still use `esClient` — the service account lacks `indices:admin/aliases` on
   * caller-created indices in serverless.
   */
  migrationEsClient: ElasticsearchClient;
  /**
   * When false, Security-scoped `.entities.v2.*.security_{namespace}` assets are
   * left in place. Reads and writes stay on those concrete names until they are
   * deleted after a later migration.
   */
  allowLegacyMigration: boolean;
}

/**
 * Installs all shared Elasticsearch assets and storage that must exist before per-entity
 * initialization begins: ingest pipeline, component templates (for ALL entity types),
 * index templates, and the latest index.
 */
export async function installSharedElasticsearchAssets({
  esClient,
  migrationEsClient,
  logger,
  namespace,
  allowLegacyMigration,
}: InstallSharedElasticsearchAssetOptions): Promise<void> {
  try {
    await installLatestIndexIngestPipeline(esClient, namespace, logger);
    await installMetadataIndexIngestPipeline(esClient, namespace, logger);
    await installAllComponentTemplates(esClient, namespace, logger);
    await installIndexTemplates(esClient, namespace, logger);

    const legacyPresent = await hasLegacySecurityAssets(migrationEsClient, namespace);
    if (legacyPresent && allowLegacyMigration) {
      await migrateLegacySecurityAssets({
        esClient: migrationEsClient,
        logger,
        namespace,
      });
    } else if (legacyPresent) {
      logger.info(
        `Skipping legacy Security-scoped Entity Store migration in ${namespace}; feature flag is off`
      );
    }

    // Greenfield (or post-migration): ensure neutral indices/data streams exist.
    // Skipped per-dataset while the matching legacy concrete asset still exists.
    await installIndicesAndDataStreams(esClient, namespace, logger);

    // Bridge custom / predefined roles still granting `.entities.v2.*.security_*`
    // until elasticsearch-controller and ES reserved roles ship neutral patterns.
    // Use the requesting user (esClient), not the Kibana service account: on serverless
    // `elastic/kibana` is not granted `indices:admin/aliases` / `manage` on these
    // indices (they were just created by the caller), which otherwise 500s install.
    await ensureLegacyCompatibilityAliases({
      esClient,
      logger,
      namespace,
    });
  } catch (error) {
    logger.error(`error installing shared assets in ${namespace}: ${error}`);
    throw error;
  }
}

/**
 * Creates the latest index and data streams after the required templates are installed.
 */
export async function installIndicesAndDataStreams(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) {
  const targets = await resolveEntityStoreWriteTargets(esClient, namespace);
  const latestIndex = getLatestEntitiesIndexName(namespace);

  await Promise.all([
    (async () => {
      if (targets.latestIndex !== latestIndex) {
        logger.debug(
          `Skipping create of ${latestIndex}; writes stay on ${targets.latestIndex} until migration deletes it`
        );
        return;
      }
      await createIndex(esClient, latestIndex, {
        throwIfExists: false,
        aliases: { [getEntitiesAlias(ENTITY_LATEST, namespace)]: {} },
      });
      logger.debug(`created latest entity index in ${namespace}`);
    })(),

    (async () => {
      await createDataStream(esClient, getMetadataEntitiesDataStreamName(namespace), {
        throwIfExists: false,
      });
      logger.debug(`created metadata entity data stream in ${namespace}`);
    })(),
  ]);
}

async function installIndexTemplates(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) {
  await Promise.all([
    (async () => {
      await putIndexTemplate(esClient, getLatestEntityIndexTemplateConfig(namespace));
      logger.debug(`installed latest index template in ${namespace}`);
    })(),

    (async () => {
      await putIndexTemplate(esClient, getHistorySnapshotIndexTemplateConfig(namespace));
      logger.debug(`installed history snapshot index template in ${namespace}`);
    })(),

    (async () => {
      await putIndexTemplate(esClient, getMetadataEntityIndexTemplateConfig(namespace));
      logger.debug(`installed metadata index template in ${namespace}`);
    })(),
  ]);
}

async function installAllComponentTemplates(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) {
  const definitions = ALL_ENTITY_TYPES.map((type) => getEntityDefinition(type, namespace));
  await Promise.all([
    ...definitions.map((definition) =>
      (async () => {
        await putComponentTemplate(
          esClient,
          getEntityDefinitionComponentTemplate(definition, namespace)
        );
        logger.debug(`installed latest component template for: ${definition.type} in ${namespace}`);
      })()
    ),
    (async () => {
      await putComponentTemplate(esClient, getMetadataComponentTemplate(namespace));
      logger.debug(`installed metadata component template in ${namespace}`);
    })(),
  ]);
}

// TODO: add retry
export async function uninstallElasticsearchAssets({
  esClient,
  logger,
  namespace,
}: SharedElasticsearchAssetOptions): Promise<void> {
  try {
    // Only delete indices and data streams.
    // Component templates, index templates, and ingest pipeline are kept intentionally
    // so they are always available for future installs, avoiding mapping race conditions.
    await uninstallIndicesAndDataStreams(esClient, namespace, logger);
  } catch (error) {
    logger.error(`error uninstalling assets: ${error}`);
    // TODO: degrade status?
    throw error;
  }
}

async function uninstallIndicesAndDataStreams(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger
) {
  const colliding = await hasCollidingNeutralNamespaceAssets(esClient, namespace);

  await Promise.all([
    (async () => {
      await deleteIndex(esClient, getLatestEntitiesIndexName(namespace));
      if (!colliding) {
        await deleteIndex(esClient, getLegacySecurityLatestEntitiesIndexName(namespace));
      }
      logger.debug(`deleted entity index`);
    })(),
    (async () => {
      // Resolve wildcards to concrete names first: ES rejects wildcard deletes when
      // `action.destructive_requires_name=true` (default in Kibana test clusters).
      await deleteHistorySnapshotIndices(esClient, namespace, logger, colliding);
    })(),
    (async () => {
      await deleteDataStream(esClient, getUpdatesEntitiesDataStreamName(namespace));
      if (!colliding) {
        await deleteDataStream(esClient, getLegacySecurityUpdatesEntitiesDataStreamName(namespace));
      }
      logger.debug(`deleted entity updates data stream`);
      await Promise.all([
        deleteIndexTemplate(esClient, getUpdatesIndexTemplateId(namespace)),
        deleteIndexTemplate(esClient, getLegacySecurityUpdatesIndexTemplateId(namespace)),
      ]);
      logger.debug(`deleted entity updates index templates`);
      await Promise.all(
        ALL_ENTITY_TYPES.map((type) =>
          deleteComponentTemplate(esClient, getUpdatesComponentTemplateName(type, namespace))
        )
      );
      logger.debug(`deleted entity updates component templates`);
    })(),
    (async () => {
      await deleteDataStream(esClient, getMetadataEntitiesDataStreamName(namespace));
      if (!colliding) {
        await deleteDataStream(
          esClient,
          getLegacySecurityMetadataEntitiesDataStreamName(namespace)
        );
      }
      logger.debug(`deleted entity metadata data stream`);
    })(),
  ]);
}

async function deleteHistorySnapshotIndices(
  esClient: ElasticsearchClient,
  namespace: string,
  logger: Logger,
  collidingNeutralNamespace: boolean
): Promise<void> {
  // Include the legacy Security-scoped pattern so pre-migration leftovers (or a
  // failed upgrade) are removed on uninstall, not left as orphaned storage.
  // Skip it when those names belong to space `security_{namespace}`.
  const patterns = [
    getHistorySnapshotIndexPattern(namespace),
    ...(collidingNeutralNamespace ? [] : [getLegacySecurityHistorySnapshotIndexPattern(namespace)]),
  ];

  const historyIndices = (
    await Promise.all(
      patterns.map(async (pattern) => {
        try {
          const resolved = await esClient.indices.resolveIndex({ name: pattern });
          return resolved.indices.map((index) => index.name);
        } catch {
          return [];
        }
      })
    )
  ).flat();

  if (historyIndices.length === 0) {
    logger.debug(`no history snapshot indices to delete for ${patterns.join(', ')}`);
    return;
  }

  await Promise.all(historyIndices.map((index) => deleteIndex(esClient, index)));
  logger.debug(`deleted entity history snapshot indices: ${historyIndices.join(', ')}`);
}
