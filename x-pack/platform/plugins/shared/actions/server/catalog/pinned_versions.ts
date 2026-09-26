/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';

export type PinnedVersionsClient = Pick<ISavedObjectsRepository, 'find'>;

/** Pinned spec versions per connector type id, across all spaces. */
export type PinnedSpecVersions = Map<string, Set<string>>;

interface TermsBucket {
  key: string;
  versions?: { buckets?: Array<{ key: string }> };
}

interface PinnedVersionsAggregation {
  types?: { buckets?: TermsBucket[] };
}

const MAX_TYPES = 1000;
const MAX_VERSIONS_PER_TYPE = 100;

/**
 * Aggregates `action` saved objects on `actionTypeId` and `specVersion`. Used at boot and
 * reload to build every version a saved connector still needs.
 */
export const findPinnedSpecVersions = async (
  client: PinnedVersionsClient,
  logger: Logger
): Promise<PinnedSpecVersions> => {
  const pinned: PinnedSpecVersions = new Map();
  try {
    const response = await client.find<unknown, PinnedVersionsAggregation>({
      type: 'action',
      namespaces: ['*'],
      perPage: 0,
      filter: 'action.attributes.specVersion: *',
      aggs: {
        types: {
          terms: { field: 'action.attributes.actionTypeId', size: MAX_TYPES },
          aggs: {
            versions: {
              terms: { field: 'action.attributes.specVersion', size: MAX_VERSIONS_PER_TYPE },
            },
          },
        },
      },
    });
    for (const typeBucket of response.aggregations?.types?.buckets ?? []) {
      const versions = new Set(
        (typeBucket.versions?.buckets ?? []).map((versionBucket) => versionBucket.key)
      );
      if (versions.size > 0) {
        pinned.set(typeBucket.key, versions);
      }
    }
  } catch (error) {
    logger.warn(
      `Failed to read pinned connector spec versions: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  return pinned;
};
