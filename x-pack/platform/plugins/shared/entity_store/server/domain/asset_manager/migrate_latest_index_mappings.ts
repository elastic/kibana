/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  LATEST_INDEX_MAPPINGS_VERSION,
  LATEST_INDEX_MAPPINGS_VERSION_META_KEY,
} from '../../../common/domain/entity_index';
import { isEsResponseErrorWithStatus } from '../../infra/elasticsearch/es_errors';
import { installAllComponentTemplates, installIndexTemplates } from './install_assets';
import { getLatestIndexMappingProperties } from './latest_index_mappings';
import { resolveEntityStoreWriteTargets } from './resolve_entity_store_indices';

export type MigrateLatestIndexMappingsResult = 'migrated' | 'up_to_date' | 'index_missing';

interface MigrateLatestIndexMappingsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
}

type IndexMeta = Record<string, unknown>;
type MappingProperties = NonNullable<MappingTypeMapping['properties']>;
type MappingProperty = MappingProperties[string];

type LatestIndexMapping =
  | { exists: false }
  | { exists: true; meta: IndexMeta; properties: MappingProperties };

const getLatestIndexMapping = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<LatestIndexMapping> => {
  try {
    const response = await esClient.indices.getMapping({ index });
    // Keyed by the concrete index name, which is not necessarily the requested name.
    const [entry] = Object.values(response);
    return {
      exists: true,
      meta: entry?.mappings?._meta ?? {},
      properties: entry?.mappings?.properties ?? {},
    };
  } catch (error) {
    if (isEsResponseErrorWithStatus(error, 404)) {
      return { exists: false };
    }
    throw error;
  }
};

/** Flattens the nested live `properties` into a map keyed by every dotted field path. */
const flattenLiveProperties = (
  properties: MappingProperties,
  prefix = '',
  paths: Map<string, MappingProperty> = new Map()
): Map<string, MappingProperty> => {
  for (const [name, field] of Object.entries(properties)) {
    const path = `${prefix}${name}`;
    paths.set(path, field);
    if ('properties' in field && field.properties) {
      flattenLiveProperties(field.properties, `${path}.`, paths);
    }
  }
  return paths;
};

const getFieldType = (field: MappingProperty): string | undefined =>
  field.type ?? ('properties' in field && field.properties ? 'object' : undefined);

const canHaveChildFields = (field: MappingProperty): boolean => {
  const type = getFieldType(field);
  return type === undefined || type === 'object' || type === 'nested';
};

/** The dotted ancestors of a path, closest to the root first: `a.b.c` gives `a`, `a.b`. */
const getAncestorPaths = (path: string): string[] => {
  const segments = path.split('.');
  return segments.slice(0, -1).map((_, index) => segments.slice(0, index + 1).join('.'));
};

/**
 * Splits the desired (flat, dotted) properties into the ones to send and the problems that cannot
 * be fixed in place. Elasticsearch cannot change the type of an existing field, so a present
 * field is never sent: a conflicting request would fail, and be retried, forever.
 */
const diffProperties = (
  desired: MappingProperties,
  live: MappingProperties
): { missing: MappingProperties; conflicts: string[] } => {
  const livePaths = flattenLiveProperties(live);
  const missing: MappingProperties = {};
  const conflicts: string[] = [];

  for (const [path, wanted] of Object.entries(desired)) {
    const liveField = livePaths.get(path);
    if (liveField) {
      const liveType = getFieldType(liveField);
      const wantedType = wanted.type;
      if (wantedType !== undefined && liveType !== wantedType) {
        conflicts.push(
          `field ${path} is mapped as ${
            liveType ?? 'unknown'
          } but the definition expects ${wantedType}; it needs a reindex`
        );
      }
      continue;
    }

    const leafAncestor = getAncestorPaths(path)
      .map((ancestorPath) => ({ path: ancestorPath, field: livePaths.get(ancestorPath) }))
      .find(({ field }) => field !== undefined && !canHaveChildFields(field));
    if (leafAncestor) {
      conflicts.push(
        `field ${path} cannot be added because its parent ${leafAncestor.path} is mapped as ${
          leafAncestor.field ? getFieldType(leafAncestor.field) : 'unknown'
        }; it needs a reindex`
      );
      continue;
    }

    missing[path] = wanted;
  }

  return { missing, conflicts };
};

/**
 * Brings the already-created latest index of a namespace up to the current definition
 * mappings with an in-place `putMapping` (properties and `_meta` only, never settings,
 * because the index is `index.mode: lookup`). A no-op when the index `_meta` version is
 * current. Only the properties that are missing from the live mapping are sent; a field that
 * exists with a different type (or under a leaf parent) cannot be changed in place, so it is
 * skipped and logged as one warning that it needs a reindex. The version is written by the same
 * request as the properties (or alone when nothing is missing), so a failure leaves it old and
 * the next run retries.
 */
export const migrateLatestIndexMappings = async ({
  esClient,
  logger,
  namespace,
}: MigrateLatestIndexMappingsParams): Promise<MigrateLatestIndexMappingsResult> => {
  const { latestIndex } = await resolveEntityStoreWriteTargets(esClient, namespace);

  const liveMapping = await getLatestIndexMapping(esClient, latestIndex);
  if (!liveMapping.exists) {
    logger.debug(`Latest index ${latestIndex} does not exist in namespace ${namespace}`);
    return 'index_missing';
  }

  const { meta: existingMeta, properties: liveProperties } = liveMapping;
  const storedVersion = existingMeta[LATEST_INDEX_MAPPINGS_VERSION_META_KEY];
  const currentStoredVersion = typeof storedVersion === 'number' ? storedVersion : 0;
  if (currentStoredVersion >= LATEST_INDEX_MAPPINGS_VERSION) {
    logger.debug(
      `Latest index ${latestIndex} mappings are up to date in namespace ${namespace} (version ${currentStoredVersion})`
    );
    return 'up_to_date';
  }

  const { missing, conflicts } = diffProperties(
    getLatestIndexMappingProperties(namespace),
    liveProperties
  );
  if (conflicts.length > 0) {
    logger.warn(
      `Latest index ${latestIndex} in namespace ${namespace} has fields that cannot be updated in place: ${conflicts.join(
        '; '
      )}`
    );
  }

  try {
    await installAllComponentTemplates(esClient, namespace, logger);
    await installIndexTemplates(esClient, namespace, logger);
    await esClient.indices.putMapping({
      index: latestIndex,
      ...(Object.keys(missing).length > 0 ? { properties: missing } : {}),
      _meta: {
        ...existingMeta,
        [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION,
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to migrate latest index mappings of ${latestIndex} in namespace ${namespace}: ${reason}`,
      { cause: error }
    );
  }

  logger.info(
    `Migrated latest index ${latestIndex} mappings in namespace ${namespace} from version ${currentStoredVersion} to ${LATEST_INDEX_MAPPINGS_VERSION}`
  );
  return 'migrated';
};
