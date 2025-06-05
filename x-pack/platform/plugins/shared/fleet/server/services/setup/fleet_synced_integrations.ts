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
import { SO_SEARCH_LIMIT } from '../../constants';
import { licenseService } from '../license';

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

export const canEnableSyncIntegrations = () => {
  const { enableSyncIntegrationsOnRemote } = appContextService.getExperimentalFeatures();
  const isServerless = appContextService.getCloud()?.isServerlessEnabled;
  return enableSyncIntegrationsOnRemote && licenseService.isEnterprise() && !isServerless;
};

export async function createOrUpdateFleetSyncedIntegrationsIndex(esClient: ElasticsearchClient) {
  appContextService.getLogger().debug('Create or update fleet-synced-integrations index');
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
  if (!canEnableSyncIntegrations()) {
    return;
  }

  if (appContextService.getConfig()?.enableManagedLogsAndMetricsDataviews !== true) {
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

  const results = await savedObjectsClient.find({
    type: INDEX_PATTERN_SAVED_OBJECT_TYPE,
    perPage: SO_SEARCH_LIMIT,
    namespaces: ['*'],
    fields: ['namespaces'],
  });
  const existingIndexPatterns = results.saved_objects.reduce((acc, savedObject) => {
    acc[savedObject.id] = { namespaces: savedObject.namespaces ?? [], id: savedObject.id };
    return acc;
  }, {} as Record<string, { namespaces: string[]; id: string }>);

  const notExistingIndexPatterns = indexPatternSavedObjectsWithRemoteCluster.filter(
    (indexPatternSavedObject) => !existingIndexPatterns[indexPatternSavedObject.id]
  );

  if (notExistingIndexPatterns.length > 0) {
    await savedObjectsImporter.import({
      overwrite: false,
      readStream: createListStream(notExistingIndexPatterns),
      createNewCopies: false,
      refresh: false,
      managed: true,
    });
  }

  const indexPatternsNotInAllSpaces = indexPatternSavedObjectsWithRemoteCluster.filter(
    (indexPatternSavedObject) =>
      !existingIndexPatterns[indexPatternSavedObject.id] ||
      !existingIndexPatterns[indexPatternSavedObject.id].namespaces.includes('*')
  );

  // Make index patterns available in all spaces
  for (const indexPatternSavedObject of indexPatternsNotInAllSpaces) {
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
