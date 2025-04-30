/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  ISavedObjectsImporter,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { createListStream } from '@kbn/utils';

import { FleetSetupError } from '../../errors';
import { appContextService } from '../app_context';
import {
  INDEX_PATTERN_SAVED_OBJECT_TYPE,
  indexPatternTypes,
} from '../epm/kibana/index_pattern/install';

export const FLEET_SYNCED_INTEGRATIONS_INDEX_NAME = 'fleet-synced-integrations';
export const FLEET_SYNCED_INTEGRATIONS_CCR_INDEX_PREFIX = 'fleet-synced-integrations-ccr-*';

export const FLEET_SYNCED_INTEGRATIONS_INDEX_CONFIG = {
  settings: {
    auto_expand_replicas: '0-1',
  },
  mappings: {
    dynamic: false,
    _meta: {
      version: '1.0',
    },
    properties: {
      remote_es_hosts: {
        properties: {
          name: {
            type: 'keyword',
          },
          hosts: {
            type: 'keyword',
          },
          sync_integrations: {
            type: 'boolean',
          },
        },
      },
      integrations: {
        properties: {
          package_name: {
            type: 'keyword',
          },
          package_version: {
            type: 'keyword',
          },
          updated_at: {
            type: 'date',
          },
        },
      },
    },
  },
};

export async function createOrUpdateFleetSyncedIntegrationsIndex(esClient: ElasticsearchClient) {
  const { enableSyncIntegrationsOnRemote } = appContextService.getExperimentalFeatures();

  if (!enableSyncIntegrationsOnRemote) {
    return;
  }

  await createOrUpdateIndex(
    esClient,
    FLEET_SYNCED_INTEGRATIONS_INDEX_NAME,
    FLEET_SYNCED_INTEGRATIONS_INDEX_CONFIG
  );
}

async function createOrUpdateIndex(
  esClient: ElasticsearchClient,
  indexName: string,
  indexData: any
) {
  const resExists = await esClient.indices.exists({
    index: indexName,
  });

  if (resExists) {
    return updateIndex(esClient, indexName, indexData);
  }

  return createIndex(esClient, indexName, indexData);
}

async function updateIndex(esClient: ElasticsearchClient, indexName: string, indexData: any) {
  try {
    const res = await esClient.indices.getMapping({
      index: indexName,
    });

    const versionChanged =
      res[indexName].mappings?._meta?.version !== indexData.mappings._meta.version;
    if (versionChanged) {
      await esClient.indices.putMapping({
        index: indexName,
        body: Object.assign({
          ...indexData.mappings,
        }),
      });
    }
  } catch (err) {
    throw new FleetSetupError(`update of index [${indexName}] failed ${err}`);
  }
}

async function createIndex(esClient: ElasticsearchClient, indexName: string, indexData: any) {
  try {
    await esClient.indices.create({
      index: indexName,
      body: indexData,
    });
  } catch (err) {
    if (err?.body?.error?.type !== 'resource_already_exists_exception') {
      throw new FleetSetupError(`create of index [${indexName}] failed ${err}`);
    }
  }
}

export async function createCCSIndexPatterns(
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  savedObjectsImporter: ISavedObjectsImporter
) {
  const { enableSyncIntegrationsOnRemote } = appContextService.getExperimentalFeatures();

  if (!enableSyncIntegrationsOnRemote) {
    return;
  }

  const remoteInfo = await esClient.cluster.remoteInfo();
  const remoteClusterNames = Object.keys(remoteInfo);

  if (remoteClusterNames.length === 0) {
    return;
  }

  const indexPatternSavedObjectsWithRemoteCluster: SavedObject[] = [];

  for (const clusterName of remoteClusterNames) {
    for (const indexPatternType of indexPatternTypes) {
      indexPatternSavedObjectsWithRemoteCluster.push({
        id: `${clusterName}:${indexPatternType}-*`,
        type: INDEX_PATTERN_SAVED_OBJECT_TYPE,
        typeMigrationVersion: '8.0.0',
        attributes: {
          title: `${clusterName}:${indexPatternType}-*`,
          timeFieldName: '@timestamp',
          allowNoIndex: true,
        },
        references: [],
      });
    }
  }

  await savedObjectsImporter.import({
    overwrite: false,
    readStream: createListStream(indexPatternSavedObjectsWithRemoteCluster),
    createNewCopies: false,
    refresh: false,
    managed: true,
  });

  // Make index patterns available in all spaces
  for (const indexPatternSavedObject of indexPatternSavedObjectsWithRemoteCluster) {
    try {
      await savedObjectsClient.updateObjectsSpaces(
        [{ id: indexPatternSavedObject.id, type: INDEX_PATTERN_SAVED_OBJECT_TYPE }],
        ['*'],
        []
      );
    } catch (error) {
      appContextService
        .getLogger()
        .error(`Error making managed index patterns global: ${error.message}`);
    }
  }
}
