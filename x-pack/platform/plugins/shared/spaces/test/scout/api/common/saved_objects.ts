/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';

import type { KbnClient } from '@kbn/scout';

const DEFAULT_SPACE_ID = 'default';

// Indices that back Kibana saved objects. Mirrors `ALL_SAVED_OBJECT_INDICES` but
// avoids pulling a server-only package into the Scout test bundle.
export const ALL_SAVED_OBJECT_INDICES = ['.kibana*'];

const ARCHIVE_SPACES = ['default', 'space_1', 'space_2', 'space_3', 'other_space'] as const;

const archivePath = (space: string) =>
  `x-pack/platform/plugins/shared/spaces/test/scout/api/fixtures/kbn_archiver/${space}_objects.json`;

/**
 * Loads the saved-object archives used by the `get_all` and `delete` matrices into
 * their respective spaces.
 */
export const loadSavedObjects = async (kbnClient: KbnClient) => {
  for (const space of ARCHIVE_SPACES) {
    await kbnClient.importExport.load(archivePath(space), { space });
  }
};

export const unloadSavedObjects = async (kbnClient: KbnClient) => {
  for (const space of ARCHIVE_SPACES) {
    await kbnClient.importExport.unload(archivePath(space), { space });
  }
};

export const loadSpace2Objects = async (kbnClient: KbnClient) => {
  await kbnClient.importExport.load(archivePath('space_2'), { space: 'space_2' });
};

export interface SpaceCountBucket {
  key: string;
  doc_count: number;
  countByType: estypes.AggregationsStringTermsAggregate;
}

interface SpaceCountAggregate extends estypes.AggregationsMultiBucketAggregateBase {
  buckets: SpaceCountBucket[];
}

/**
 * Aggregates saved objects by normalized namespace and type. Shared contract: the delete
 * suite asserts a deleted space's objects were fully cascaded, and the copy_to_space suite
 * asserts per-space counts before/after copies — both compare the exact bucket shapes
 * returned here.
 */
export const getAggregatedSpaceData = (es: Client, objectTypes: string[]) =>
  es.search<unknown, { count: SpaceCountAggregate }>({
    index: ALL_SAVED_OBJECT_INDICES,
    ignore_unavailable: true,
    request_cache: false,
    size: 0,
    runtime_mappings: {
      normalized_namespace: {
        type: 'keyword',
        script: `
          if (doc["namespaces"].size() > 0) {
            emit(doc["namespaces"].value);
          } else if (doc["namespace"].size() > 0) {
            emit(doc["namespace"].value);
          } else if (doc["legacy-url-alias.targetNamespace"].size() > 0) {
            emit(doc["legacy-url-alias.targetNamespace"].value);
          }
        `,
      },
    },
    query: { terms: { type: objectTypes } },
    aggs: {
      count: {
        terms: { field: 'normalized_namespace', missing: DEFAULT_SPACE_ID, size: 10 },
        aggs: { countByType: { terms: { field: 'type', missing: 'UNKNOWN', size: 10 } } },
      },
    },
  });
