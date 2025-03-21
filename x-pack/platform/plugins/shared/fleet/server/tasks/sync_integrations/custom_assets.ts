/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { CustomAssetsData, IntegrationsData, SyncIntegrationsData } from './model';

const DELETED_ASSET_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export const findIntegration = (assetName: string, integrations: IntegrationsData[]) => {
  const matches = assetName.match(/^(\w*)?(?:\-)?(\w*)(?:\-)?(?:\.)?(?:\w*)?@custom$/);
  if (!matches) return undefined;

  return integrations.find((integration) => {
    return (
      (['logs', 'metrics', 'traces'].includes(matches[1]) &&
        matches[2] === integration.package_name) || // e.g. logs-system.auth@custom
      (!['logs', 'metrics', 'traces'].includes(matches[1]) && // e.g. synthetics-tcp@custom
        matches[1] === integration.package_name)
    );
  });
};

export const getCustomAssets = async (
  esClient: ElasticsearchClient,
  integrations: IntegrationsData[],
  abortController: AbortController,
  previousSyncIntegrationsData: SyncIntegrationsData | undefined
): Promise<CustomAssetsData[]> => {
  const customTemplates = await esClient.cluster.getComponentTemplate(
    {
      name: '*@custom',
    },
    {
      ignore: [404],
      signal: abortController.signal,
    }
  );

  const customAssetsComponentTemplates = customTemplates.component_templates.reduce(
    (acc: CustomAssetsData[], template) => {
      const integration = findIntegration(template.name, integrations);
      if (!integration) return acc;
      acc.push({
        type: 'component_template',
        name: template.name,
        package_name: integration.package_name ?? '',
        package_version: integration.package_version ?? '',
        is_deleted: false,
        template: template.component_template.template,
      });
      return acc;
    },
    []
  );

  const ingestPipelines = await esClient.ingest.getPipeline(
    {
      id: '*@custom',
    },
    {
      ignore: [404],
      signal: abortController.signal,
    }
  );

  const customAssetsIngestPipelines = Object.keys(ingestPipelines).reduce(
    (acc: CustomAssetsData[], pipeline) => {
      const integration = findIntegration(pipeline, integrations);
      if (!integration) return acc;
      acc.push({
        type: 'ingest_pipeline',
        name: pipeline,
        package_name: integration.package_name ?? '',
        package_version: integration.package_version ?? '',
        is_deleted: false,
        pipeline: ingestPipelines[pipeline],
      });
      return acc;
    },
    []
  );

  const updatedAssets = [...customAssetsComponentTemplates, ...customAssetsIngestPipelines];

  const deletedAssets = updateDeletedAssets(previousSyncIntegrationsData, updatedAssets);

  return [...updatedAssets, ...deletedAssets];
};

function updateDeletedAssets(
  previousSyncIntegrationsData: SyncIntegrationsData | undefined,
  updatedAssets: CustomAssetsData[]
): CustomAssetsData[] {
  const deletedAssets: CustomAssetsData[] = [];

  Object.values(previousSyncIntegrationsData?.custom_assets ?? {}).forEach(
    (existingAsset: CustomAssetsData) => {
      if (existingAsset.is_deleted) {
        if (
          existingAsset.deleted_at &&
          Date.now() - Date.parse(existingAsset.deleted_at) < DELETED_ASSET_TTL
        ) {
          deletedAssets.push(existingAsset);
        }
      } else {
        const matchingAsset = updatedAssets.find(
          (asset) => existingAsset.name === asset.name && existingAsset.type === asset.type
        );
        if (!matchingAsset) {
          deletedAssets.push({
            ...existingAsset,
            is_deleted: true,
            deleted_at: new Date().toISOString(),
          });
        }
      }
    }
  );

  return deletedAssets;
}
