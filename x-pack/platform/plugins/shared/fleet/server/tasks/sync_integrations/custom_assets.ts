/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import { isEqual } from 'lodash';
import type {
  ClusterGetComponentTemplateResponse,
  IngestGetPipelineResponse,
} from '@elastic/elasticsearch/lib/api/types';

import { retryTransientEsErrors } from '../../services/epm/elasticsearch/retry';

import { packagePolicyService } from '../../services';
import { SO_SEARCH_LIMIT } from '../../constants';

import type { CustomAssetsData, IntegrationsData, SyncIntegrationsData } from './model';

const DELETED_ASSET_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
export const CUSTOM_ASSETS_PREFIX = '*@custom';

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

export function getComponentTemplate(
  esClient: ElasticsearchClient,
  name: string,
  abortController: AbortController
): Promise<ClusterGetComponentTemplateResponse> {
  return esClient.cluster.getComponentTemplate(
    {
      name,
    },
    {
      ignore: [404],
      signal: abortController.signal,
    }
  );
}

export function getPipeline(
  esClient: ElasticsearchClient,
  name: string,
  abortController: AbortController
): Promise<IngestGetPipelineResponse> {
  return esClient.ingest.getPipeline(
    {
      id: name,
    },
    {
      ignore: [404],
      signal: abortController.signal,
    }
  );
}

export const getCustomAssets = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  integrations: IntegrationsData[],
  abortController: AbortController,
  previousSyncIntegrationsData: SyncIntegrationsData | undefined
): Promise<CustomAssetsData[]> => {
  const customTemplates = await getComponentTemplate(
    esClient,
    CUSTOM_ASSETS_PREFIX,
    abortController
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

  const ingestPipelines = await getPipeline(esClient, CUSTOM_ASSETS_PREFIX, abortController);

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

  const customPipelineFromVars = await getPipelinesFromVars(esClient, soClient, abortController);

  const updatedAssets = [
    ...customAssetsComponentTemplates,
    ...customAssetsIngestPipelines,
    ...customPipelineFromVars,
  ];

  const deletedAssets = updateDeletedAssets(previousSyncIntegrationsData, updatedAssets);

  return [...updatedAssets, ...deletedAssets];
};

export async function getPipelinesFromVars(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  abortController: AbortController
): Promise<CustomAssetsData[]> {
  const packagePolicies = await packagePolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
    spaceId: '*',
  });
  const customPipelineFromVars: CustomAssetsData[] = [];
  for (const packagePolicy of packagePolicies.items) {
    for (const input of packagePolicy.inputs) {
      for (const stream of input.streams) {
        // find stream vars called `pipeline`
        if (stream.vars?.pipeline && stream.vars.pipeline.value) {
          const pipelineName = stream.vars.pipeline.value;
          // find pipeline definition for the matching var value
          const pipelineDef = await getPipeline(esClient, pipelineName, abortController);

          if (pipelineDef[pipelineName]) {
            customPipelineFromVars.push({
              type: 'ingest_pipeline',
              name: pipelineName,
              package_name: packagePolicy.package?.name ?? '',
              package_version: packagePolicy.package?.version ?? '',
              is_deleted: false,
              pipeline: pipelineDef[pipelineName],
            });
          }
        }
      }
    }
  }
  return customPipelineFromVars;
}

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

async function updateComponentTemplate(
  customAsset: CustomAssetsData,
  esClient: ElasticsearchClient,
  abortController: AbortController,
  logger: Logger
) {
  const customTemplates = await getComponentTemplate(esClient, customAsset.name, abortController);
  const existingTemplate = customTemplates.component_templates?.find(
    (template) => template.name === customAsset.name
  );
  if (customAsset.is_deleted) {
    if (existingTemplate) {
      logger.debug(`Deleting component template: ${customAsset.name}`);
      return retryTransientEsErrors(
        () =>
          esClient.cluster.deleteComponentTemplate(
            {
              name: customAsset.name,
            },
            {
              signal: abortController.signal,
            }
          ),
        { logger }
      );
    } else {
      return;
    }
  }
  let shouldUpdateTemplate = false;
  if (existingTemplate) {
    shouldUpdateTemplate = !isEqual(
      existingTemplate.component_template.template,
      customAsset.template
    );
  } else {
    shouldUpdateTemplate = true;
  }

  if (shouldUpdateTemplate) {
    logger.debug(`Updating component template: ${customAsset.name}`);
    return retryTransientEsErrors(
      () =>
        esClient.cluster.putComponentTemplate(
          {
            name: customAsset.name,
            template: customAsset.template,
          },
          {
            signal: abortController.signal,
          }
        ),
      { logger }
    );
  }
}

async function updateIngestPipeline(
  customAsset: CustomAssetsData,
  esClient: ElasticsearchClient,
  abortController: AbortController,
  logger: Logger
) {
  const ingestPipelines = await getPipeline(esClient, customAsset.name, abortController);
  const existingPipeline = ingestPipelines[customAsset.name];

  if (customAsset.is_deleted) {
    if (existingPipeline) {
      logger.debug(`Deleting ingest pipeline: ${customAsset.name}`);
      return retryTransientEsErrors(
        () =>
          esClient.ingest.deletePipeline(
            {
              id: customAsset.name,
            },
            {
              signal: abortController.signal,
            }
          ),
        { logger }
      );
    } else {
      return;
    }
  }

  let shouldUpdatePipeline = false;
  if (existingPipeline) {
    shouldUpdatePipeline =
      (existingPipeline.version && existingPipeline.version < customAsset.pipeline.version) ||
      (!existingPipeline.version && !isEqual(existingPipeline, customAsset.pipeline));
  } else {
    shouldUpdatePipeline = true;
  }

  if (shouldUpdatePipeline) {
    logger.debug(`Updating ingest pipeline: ${customAsset.name}`);
    return retryTransientEsErrors(
      () =>
        esClient.ingest.putPipeline(
          {
            id: customAsset.name,
            ...customAsset.pipeline,
          },
          {
            signal: abortController.signal,
          }
        ),
      { logger }
    );
  }
}

export async function installCustomAsset(
  customAsset: CustomAssetsData,
  esClient: ElasticsearchClient,
  abortController: AbortController,
  logger: Logger
) {
  if (customAsset.type === 'component_template') {
    return updateComponentTemplate(customAsset, esClient, abortController, logger);
  } else if (customAsset.type === 'ingest_pipeline') {
    return updateIngestPipeline(customAsset, esClient, abortController, logger);
  }
}
