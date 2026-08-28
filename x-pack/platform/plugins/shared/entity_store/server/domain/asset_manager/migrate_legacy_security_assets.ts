/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getErrorMessage } from '../../../common';
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
  assertReindexSucceeded,
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
import { getLegacySecurityUpdatesIndexTemplateId } from './updates_data_stream';
import { getLegacySecurityHistorySnapshotIndexTemplateId } from './history_snapshot_index_template';
import {
  getLegacySecurityHistorySnapshotIndexPattern,
  toNeutralHistorySnapshotIndexName,
} from './history_snapshot_index';
import {
  getUpdatesEntitiesDataStreamName,
  getLegacySecurityUpdatesEntitiesDataStreamName,
} from './updates_data_stream';
import {
  getMetadataEntitiesDataStreamName,
  getLegacySecurityMetadataEntitiesDataStreamName,
} from './metadata_data_stream';

interface MigrateLegacySecurityAssetsOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
}

/** Poll intervals for async reindex — large latest indices can exceed HTTP request timeouts. */
const REINDEX_POLL_MIN_INTERVAL_MS = 5 * 1000;
const REINDEX_POLL_MAX_INTERVAL_MS = 30 * 1000;

const getLegacyLatestCompatibilityAlias = (namespace: string) =>
  getLegacySecurityEntityIndexPattern({
    schemaVersion: ENTITY_SCHEMA_VERSION_V2,
    dataset: ENTITY_LATEST,
    namespace,
  });

/**
 * Neutral assets for space `security_{namespace}` reuse the exact concrete names that
 * legacy Security-scoped assets used for `namespace`. Entity aliases are the only
 * reliable ownership signal (`entities-latest-security_foo` vs `entities-latest-foo`).
 */
const getCollidingNeutralNamespace = (namespace: string) => `security_${namespace}`;

const resolveLegacyHistorySnapshotIndices = async (
  esClient: ElasticsearchClient,
  namespace: string
): Promise<string[]> => {
  const pattern = getLegacySecurityHistorySnapshotIndexPattern(namespace);
  try {
    const resolved = await esClient.indices.resolveIndex({ name: pattern });
    return resolved.indices.map((index) => index.name);
  } catch {
    return [];
  }
};

async function entityAliasExists(esClient: ElasticsearchClient, alias: string): Promise<boolean> {
  try {
    await esClient.indices.getAlias({ name: alias });
    return true;
  } catch {
    return false;
  }
}

/**
 * True when space `security_{namespace}` already owns Entity Store assets under the
 * names this migration would treat as legacy for `namespace`. Matching is via the
 * colliding space's `entities-{dataset}-security_{namespace}` aliases.
 */
export async function hasCollidingNeutralNamespaceAssets(
  esClient: ElasticsearchClient,
  namespace: string
): Promise<boolean> {
  const collidingNamespace = getCollidingNeutralNamespace(namespace);
  const collidingAliases = [
    getEntitiesAlias(ENTITY_LATEST, collidingNamespace),
    getEntitiesAlias(ENTITY_UPDATES, collidingNamespace),
    getEntitiesAlias(ENTITY_METADATA, collidingNamespace),
  ];
  for (const alias of collidingAliases) {
    if (await entityAliasExists(esClient, alias)) {
      return true;
    }
  }
  return false;
}

/**
 * True when `name` is a concrete index or data stream. Returns false when the name
 * is missing or exists only as an alias (e.g. a post-migration compatibility alias).
 */
export async function isConcreteIndexOrDataStream(
  esClient: ElasticsearchClient,
  name: string
): Promise<boolean> {
  try {
    const { data_streams: dataStreams } = await esClient.indices.getDataStream({ name });
    if (dataStreams.some((dataStream) => dataStream.name === name)) {
      return true;
    }
  } catch {
    // Not a data stream (or not found).
  }

  try {
    const indices = await esClient.indices.get({ index: name });
    // When `name` is only an alias, the response is keyed by concrete index names.
    return Object.hasOwn(indices, name);
  } catch {
    return false;
  }
}

/**
 * Returns true when any Security-scoped v2 entity-store assets still exist for the
 * namespace (pre platform / shared-index rename). Compatibility aliases alone do not
 * count. Also returns false when the candidate names belong to space
 * `security_{namespace}` (same concrete names as this namespace's legacy assets).
 */
export async function hasLegacySecurityAssets(
  esClient: ElasticsearchClient,
  namespace: string
): Promise<boolean> {
  // Avoid treating another space's live neutral assets as our legacy sources.
  if (await hasCollidingNeutralNamespaceAssets(esClient, namespace)) {
    return false;
  }

  const candidates = [
    getLegacySecurityLatestEntitiesIndexName(namespace),
    getLegacySecurityUpdatesEntitiesDataStreamName(namespace),
    getLegacySecurityMetadataEntitiesDataStreamName(namespace),
  ];
  for (const name of candidates) {
    if (await isConcreteIndexOrDataStream(esClient, name)) {
      return true;
    }
  }
  const legacyHistory = await resolveLegacyHistorySnapshotIndices(esClient, namespace);
  return legacyHistory.length > 0;
}

/**
 * Migrates Security-scoped `.entities.v2.*.security_{namespace}` assets to the
 * solution-neutral `.entities.v2.*.{namespace}` names. Safe to call when no legacy
 * assets exist (no-op). New templates/pipelines must already be installed.
 *
 * Name collision: legacy names for `namespace` equal neutral names for space
 * `security_{namespace}`. Migration is skipped when that colliding space already
 * owns those assets (detected via its `entities-*-security_{namespace}` aliases).
 *
 * Failure / retry model (no automatic rollback — re-run on next install):
 * - Legacy sources are deleted only after a successful reindex (or intentional drop
 *   for the short-retention updates buffer).
 * - If install fails between reindex and delete, the next install reindexes again
 *   (`conflicts: 'proceed'`) then deletes.
 * - If install fails after delete but before compatibility aliases are added,
 *   {@link ensureLegacyCompatibilityAliases} on the next install restores them.
 *
 * Role compatibility: after migration, legacy names are re-attached as aliases on
 * the neutral assets so custom roles granting `.entities.v2.*.security_*` keep
 * matching. Predefined roles in elasticsearch-controller (serverless) and
 * Elasticsearch reserved roles (stateful/ECH) must still be updated in a compatible
 * release order with this Kibana change.
 */
export async function migrateLegacySecurityAssets({
  esClient,
  logger,
  namespace,
}: MigrateLegacySecurityAssetsOptions): Promise<void> {
  const log = logger.get('migrate_legacy_security_assets');

  if (await hasCollidingNeutralNamespaceAssets(esClient, namespace)) {
    log.info(
      `Skipping legacy migration in ${namespace}: assets at security_${namespace} names ` +
        `belong to space security_${namespace} (neutral), not this space's legacy sources`
    );
    return;
  }

  if (!(await hasLegacySecurityAssets(esClient, namespace))) {
    log.debug(`No legacy security-scoped entity store assets found in ${namespace}`);
    return;
  }

  log.info(`Migrating legacy security-scoped entity store assets in ${namespace}`);

  await migrateLatestIndex({ esClient, logger: log, namespace });
  await migrateUpdatesDataStream({ esClient, logger: log, namespace });
  await migrateMetadataDataStream({ esClient, logger: log, namespace });
  await migrateHistorySnapshotIndices({ esClient, logger: log, namespace });
  await cleanupLegacyTemplatesAndPipelines({ esClient, logger: log, namespace });

  log.info(`Finished migrating legacy security-scoped entity store assets in ${namespace}`);
}

/**
 * Ensures `.entities.v2.latest.security_{ns}` and `.entities.v2.metadata.security_{ns}`
 * exist as aliases on the neutral assets once the concrete legacy sources are gone.
 * Idempotent; safe on greenfield (bridges predefined roles still granting `security_*`
 * until elasticsearch-controller / ES reserved roles ship the neutral patterns).
 *
 * Ordering: an alias cannot share a name with a live index or data stream, so this
 * must run only after legacy concrete assets have been deleted (or never existed).
 *
 * Best-effort: alias failures are logged and swallowed. Install must not 500 when the
 * caller (or Kibana SA on the upgrade path) lacks `indices:admin/aliases` — neutral
 * assets already work for roles granted on `.entities.v2.*.{ns}`.
 */
export async function ensureLegacyCompatibilityAliases({
  esClient,
  logger,
  namespace,
}: MigrateLegacySecurityAssetsOptions): Promise<void> {
  const log = logger.get('migrate_legacy_security_assets');
  const newIndex = getLatestEntitiesIndexName(namespace);
  const legacyLatestAlias = getLegacyLatestCompatibilityAlias(namespace);
  const legacyLatestConcrete = getLegacySecurityLatestEntitiesIndexName(namespace);
  const newMetadata = getMetadataEntitiesDataStreamName(namespace);
  const legacyMetadataAlias = getLegacySecurityMetadataEntitiesDataStreamName(namespace);

  try {
    if (
      (await isConcreteIndexOrDataStream(esClient, newIndex)) &&
      !(await isConcreteIndexOrDataStream(esClient, legacyLatestConcrete)) &&
      !(await isConcreteIndexOrDataStream(esClient, legacyLatestAlias))
    ) {
      await addAliasIfMissing(esClient, newIndex, legacyLatestAlias, log);
    }

    if (
      (await isConcreteIndexOrDataStream(esClient, newMetadata)) &&
      !(await isConcreteIndexOrDataStream(esClient, legacyMetadataAlias))
    ) {
      await addAliasIfMissing(esClient, newMetadata, legacyMetadataAlias, log);
    }
  } catch (error) {
    log.warn(
      `Could not ensure legacy compatibility aliases in ${namespace}: ${getErrorMessage(error)}`
    );
  }
}

async function addAliasIfMissing(
  esClient: ElasticsearchClient,
  index: string,
  alias: string,
  logger: Logger
): Promise<void> {
  try {
    const existing = await esClient.indices.getAlias({ name: alias });
    if (Object.hasOwn(existing, index)) {
      logger.debug(`Legacy compatibility alias ${alias} already points at ${index}`);
      return;
    }
  } catch {
    // Alias does not exist yet (404).
  }

  try {
    await esClient.indices.updateAliases({
      actions: [{ add: { index, alias } }],
    });
    logger.info(`Added legacy compatibility alias ${alias} → ${index}`);
  } catch (error) {
    // Serverless Kibana SA often lacks indices:admin/aliases on these indices.
    logger.warn(
      `Could not add legacy compatibility alias ${alias} → ${index}: ${getErrorMessage(error)}`
    );
  }
}

async function migrateLatestIndex({
  esClient,
  logger,
  namespace,
}: MigrateLegacySecurityAssetsOptions): Promise<void> {
  const legacyIndex = getLegacySecurityLatestEntitiesIndexName(namespace);
  const newIndex = getLatestEntitiesIndexName(namespace);
  const alias = getEntitiesAlias(ENTITY_LATEST, namespace);

  if (!(await isConcreteIndexOrDataStream(esClient, legacyIndex))) {
    return;
  }

  // Legacy still exists, so a prior attempt did not finish. Always (re)create and
  // reindex before the legacy source is deleted below: createIndex is idempotent and
  // reindex uses conflicts: 'proceed', so a partial neutral index from an interrupted
  // run is fully repopulated rather than left empty.
  //
  // op_type: 'create' is required on the background upgrade path: extract/CRUD tasks
  // may already be writing to the neutral index while this copy runs. Default
  // `index` would overwrite those newer docs with stale legacy values; `create`
  // turns destination hits into version conflicts (accounted by assertReindexSucceeded)
  // so concurrent writes are preserved.
  await createIndex(esClient, newIndex, { throwIfExists: false });
  logger.debug(`Ensured neutral latest index ${newIndex}`);
  const reindexResult = await reindex(esClient, {
    source: { index: legacyIndex },
    dest: { index: newIndex, op_type: 'create' },
    waitForTask: {
      logger,
      minTimeout: REINDEX_POLL_MIN_INTERVAL_MS,
      maxTimeout: REINDEX_POLL_MAX_INTERVAL_MS,
      forever: true,
    },
  });
  assertReindexSucceeded(reindexResult, `Latest migration ${legacyIndex} → ${newIndex}`);
  logger.info(`Reindexed ${legacyIndex} → ${newIndex}`);

  try {
    await esClient.indices.updateAliases({
      actions: [{ remove: { index: legacyIndex, alias } }, { add: { index: newIndex, alias } }],
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

  // Must run after delete: alias name must not collide with a live index.
  await addAliasIfMissing(esClient, newIndex, getLegacyLatestCompatibilityAlias(namespace), logger);
}

async function migrateUpdatesDataStream({
  esClient,
  logger,
  namespace,
}: MigrateLegacySecurityAssetsOptions): Promise<void> {
  const legacyStream = getLegacySecurityUpdatesEntitiesDataStreamName(namespace);
  const newStream = getUpdatesEntitiesDataStreamName(namespace);

  if (!(await isConcreteIndexOrDataStream(esClient, legacyStream))) {
    return;
  }

  // Updates is a short-retention extraction buffer — recreate under the new name.
  if (!(await isConcreteIndexOrDataStream(esClient, newStream))) {
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
  const legacyStream = getLegacySecurityMetadataEntitiesDataStreamName(namespace);
  const newStream = getMetadataEntitiesDataStreamName(namespace);

  if (!(await isConcreteIndexOrDataStream(esClient, legacyStream))) {
    return;
  }

  // Same retry safety as latest: legacy still existing means the copy may be incomplete.
  // Data-stream destinations require op_type: 'create'.
  await createDataStream(esClient, newStream, { throwIfExists: false });
  const reindexResult = await reindex(esClient, {
    source: { index: legacyStream },
    dest: { index: newStream, op_type: 'create' },
    waitForTask: {
      logger,
      minTimeout: REINDEX_POLL_MIN_INTERVAL_MS,
      maxTimeout: REINDEX_POLL_MAX_INTERVAL_MS,
      forever: true,
    },
  });
  assertReindexSucceeded(reindexResult, `Metadata migration ${legacyStream} → ${newStream}`);
  logger.info(`Reindexed metadata ${legacyStream} → ${newStream}`);

  await deleteDataStream(esClient, legacyStream);
  logger.debug(`Deleted legacy metadata data stream ${legacyStream}`);

  // Alias name equals the former data-stream name — only safe after delete.
  await addAliasIfMissing(esClient, newStream, legacyStream, logger);
}

async function migrateHistorySnapshotIndices({
  esClient,
  logger,
  namespace,
}: MigrateLegacySecurityAssetsOptions): Promise<void> {
  const legacyIndices = await resolveLegacyHistorySnapshotIndices(esClient, namespace);
  if (legacyIndices.length === 0) {
    return;
  }

  for (const legacyIndex of legacyIndices) {
    const newIndex = toNeutralHistorySnapshotIndexName(legacyIndex, namespace);
    await createIndex(esClient, newIndex, { throwIfExists: false });
    const reindexResult = await reindex(esClient, {
      source: { index: legacyIndex },
      dest: { index: newIndex },
      waitForTask: {
        logger,
        minTimeout: REINDEX_POLL_MIN_INTERVAL_MS,
        maxTimeout: REINDEX_POLL_MAX_INTERVAL_MS,
        forever: true,
      },
    });
    assertReindexSucceeded(reindexResult, `History migration ${legacyIndex} → ${newIndex}`);
    await deleteIndex(esClient, legacyIndex);
    logger.info(`Migrated history snapshot ${legacyIndex} → ${newIndex}`);
  }
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

  // Delete index templates before component templates: ES rejects deleting a component
  // template still referenced by an index template's composed_of unless it is listed in
  // that template's ignore_missing_component_templates (the metadata template is not).
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

  await Promise.all(
    componentTemplates.map(async (name) => {
      await deleteComponentTemplate(esClient, name);
      logger.debug(`Deleted legacy component template ${name}`);
    })
  );
}
