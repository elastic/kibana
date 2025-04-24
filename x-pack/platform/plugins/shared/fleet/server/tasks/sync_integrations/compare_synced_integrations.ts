/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEqual } from 'lodash';

import type {
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core/server';

import type {
  CcrFollowInfoFollowerIndex,
  ClusterComponentTemplateSummary,
  IngestGetPipelineResponse,
} from '@elastic/elasticsearch/lib/api/types';

import { appContextService } from '../../services';
import { getPackageSavedObjects } from '../../services/epm/packages/get';

import { IndexNotFoundError } from '../../errors';

import type { Installation } from '../../types';

import type {
  RemoteSyncedIntegrationsStatus,
  GetRemoteSyncedIntegrationsStatusResponse,
  RemoteSyncedCustomAssetsStatus,
  RemoteSyncedCustomAssetsRecord,
} from '../../../common/types';
import { SyncStatus } from '../../../common/types';

import type { IntegrationsData, SyncIntegrationsData, CustomAssetsData } from './model';
import { getPipeline, getComponentTemplate, CUSTOM_ASSETS_PREFIX } from './custom_assets';
import { getFollowerIndex } from './sync_integrations_on_remote';

export const getFollowerIndexInfo = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<{ info?: CcrFollowInfoFollowerIndex; error?: string }> => {
  try {
    const index = await getFollowerIndex(esClient, new AbortController());
    if (!index) {
      return { error: `Follower index not found` };
    }
    const res = await esClient.ccr.followInfo({
      index,
    });
    if (!res?.follower_indices || res.follower_indices.length === 0)
      return { error: `Follower index ${index} not available` };

    if (res.follower_indices[0]?.status === 'paused') {
      return { error: `Follower index ${index} paused` };
    }

    const resStats = await esClient.ccr.followStats({
      index,
    });
    if (resStats?.indices[0]?.shards[0]?.fatal_exception) {
      return {
        error: `Follower index ${index} fatal exception: ${resStats.indices[0].shards[0].fatal_exception?.reason}`,
      };
    }

    return { info: res.follower_indices[0] };
  } catch (err) {
    if (err?.body?.error?.type === 'index_not_found_exception') {
      throw new IndexNotFoundError(`Index not found`);
    }

    logger.error('error', err?.message);
    throw err;
  }
};

export const fetchAndCompareSyncedIntegrations = async (
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  index: string,
  logger: Logger
): Promise<GetRemoteSyncedIntegrationsStatusResponse> => {
  try {
    // find integrations on ccr index
    const searchRes = await esClient.search<SyncIntegrationsData>({
      index,
      sort: [
        {
          'integrations.updated_at': {
            order: 'desc',
          },
        },
      ],
    });
    if (searchRes.hits.hits[0]?._source === undefined) {
      return {
        integrations: [],
        error: `No integrations found on ${index}`,
      };
    }
    const ccrIndex = searchRes.hits.hits[0]?._source;
    const { integrations: ccrIntegrations, custom_assets: ccrCustomAssets } = ccrIndex;
    const installedCCRIntegrations = ccrIntegrations?.filter(
      (integration) => integration.install_status !== 'not_installed'
    );

    // find integrations installed on remote
    const installedIntegrations = await getPackageSavedObjects(savedObjectsClient);

    const installedIntegrationsByName = (installedIntegrations?.saved_objects || []).reduce(
      (acc, integration) => {
        if (integration?.id) {
          acc[integration.id] = integration;
        }
        return acc;
      },
      {} as Record<string, SavedObjectsFindResult<Installation>>
    );
    const customAssetsStatus = await fetchAndCompareCustomAssets(
      esClient,
      logger,
      ccrCustomAssets,
      installedIntegrationsByName
    );
    const integrationsStatus = compareIntegrations(
      installedCCRIntegrations,
      installedIntegrationsByName
    );
    const result = {
      ...integrationsStatus,
      ...(customAssetsStatus && { custom_assets: customAssetsStatus }),
    };

    return result;
  } catch (error) {
    logger.error('error', error?.message);
    return {
      integrations: [],
      error: error?.message,
    };
  }
};

const compareIntegrations = (
  ccrIntegrations: IntegrationsData[],
  installedIntegrationsByName: Record<string, SavedObjectsFindResult<Installation>>
): { integrations: RemoteSyncedIntegrationsStatus[] } => {
  const integrationsStatus: RemoteSyncedIntegrationsStatus[] | undefined = ccrIntegrations?.map(
    (ccrIntegration) => {
      const localIntegrationSO = installedIntegrationsByName[ccrIntegration.package_name];
      if (!localIntegrationSO) {
        return {
          package_name: ccrIntegration.package_name,
          package_version: ccrIntegration.package_version,
          updated_at: ccrIntegration.updated_at,
          sync_status: SyncStatus.SYNCHRONIZING,
        };
      }
      if (ccrIntegration.package_version !== localIntegrationSO?.attributes.version) {
        return {
          package_name: ccrIntegration.package_name,
          package_version: ccrIntegration.package_version,
          updated_at: ccrIntegration.updated_at,
          sync_status: SyncStatus.FAILED,
          error: `Found incorrect installed version ${localIntegrationSO?.attributes.version}`,
        };
      }
      if (localIntegrationSO?.attributes.install_status === 'install_failed') {
        const latestFailedAttemptTime = localIntegrationSO?.attributes
          ?.latest_install_failed_attempts?.[0].created_at
          ? `at ${new Date(
              localIntegrationSO?.attributes?.latest_install_failed_attempts?.[0].created_at
            ).toUTCString()}`
          : '';
        const latestFailedAttempt = localIntegrationSO?.attributes
          ?.latest_install_failed_attempts?.[0]?.error?.message
          ? `- reason: ${localIntegrationSO?.attributes?.latest_install_failed_attempts[0].error.message}`
          : '';
        return {
          package_name: ccrIntegration.package_name,
          package_version: ccrIntegration.package_version,
          updated_at: ccrIntegration.updated_at,
          sync_status: SyncStatus.FAILED,
          error: `Installation status: ${localIntegrationSO?.attributes.install_status} ${latestFailedAttempt} ${latestFailedAttemptTime}`,
        };
      }
      return {
        package_name: ccrIntegration.package_name,
        package_version: ccrIntegration.package_version,
        sync_status:
          localIntegrationSO?.attributes.install_status === 'installed'
            ? SyncStatus.COMPLETED
            : SyncStatus.SYNCHRONIZING,
        updated_at: localIntegrationSO?.updated_at,
      };
    }
  );
  return { integrations: integrationsStatus };
};

const fetchAndCompareCustomAssets = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  ccrCustomAssets: { [key: string]: CustomAssetsData },
  installedIntegrationsByName: Record<string, SavedObjectsFindResult<Installation>>
): Promise<RemoteSyncedCustomAssetsRecord | undefined> => {
  if (!ccrCustomAssets) return;

  const abortController = new AbortController();

  try {
    const installedPipelines = await getPipeline(esClient, CUSTOM_ASSETS_PREFIX, abortController);

    for (const [_, ccrCustomAsset] of Object.entries(ccrCustomAssets)) {
      if (ccrCustomAsset.type === 'ingest_pipeline' && !ccrCustomAsset.name.includes('@custom')) {
        const response = await getPipeline(esClient, ccrCustomAsset.name, abortController);
        if (response[ccrCustomAsset.name]) {
          installedPipelines[ccrCustomAsset.name] = response[ccrCustomAsset.name];
        }
      }
    }

    const installedComponentTemplates = await getComponentTemplate(
      esClient,
      CUSTOM_ASSETS_PREFIX,
      abortController
    );

    const componentTemplatesByName = (
      installedComponentTemplates?.component_templates || []
    ).reduce((acc, componentTemplate) => {
      if (componentTemplate?.name) {
        acc[componentTemplate.name] = componentTemplate.component_template?.template;
      }
      return acc;
    }, {} as Record<string, ClusterComponentTemplateSummary>);
    const componentTemplates = installedComponentTemplates?.component_templates
      ? componentTemplatesByName
      : undefined;
    const result: RemoteSyncedCustomAssetsRecord = {};

    // compare custom pipelines and custom component templates
    Object.entries(ccrCustomAssets).forEach(([ccrCustomName, ccrCustomAsset]) => {
      const res = compareCustomAssets({
        ccrCustomAsset,
        ingestPipelines: installedPipelines,
        componentTemplates,
        installedIntegration: installedIntegrationsByName[ccrCustomAsset.package_name],
      });
      result[ccrCustomName] = res;
    });
    return result;
  } catch (error) {
    logger.error('error', error?.message);
    return { error: error?.message };
  }
};

const compareCustomAssets = ({
  ccrCustomAsset,
  ingestPipelines,
  componentTemplates,
  installedIntegration,
}: {
  ccrCustomAsset: CustomAssetsData;
  ingestPipelines?: IngestGetPipelineResponse;
  componentTemplates?: Record<string, ClusterComponentTemplateSummary>;
  installedIntegration: SavedObjectsFindResult<Installation> | undefined;
}): RemoteSyncedCustomAssetsStatus => {
  const result = {
    name: ccrCustomAsset.name,
    type: ccrCustomAsset.type,
    package_name: ccrCustomAsset.package_name,
    package_version: ccrCustomAsset.package_version,
  };

  const latestCustomAssetError =
    installedIntegration?.attributes?.latest_custom_asset_install_failed_attempts?.[
      `${ccrCustomAsset.type}:${ccrCustomAsset.name}`
    ];

  const latestFailedAttemptTime = latestCustomAssetError?.created_at
    ? `at ${new Date(latestCustomAssetError?.created_at).toUTCString()}`
    : '';
  const latestFailedAttempt = latestCustomAssetError?.error?.message
    ? `- reason: ${latestCustomAssetError.error.message}`
    : '';
  const latestFailedErrorMessage = `Failed to update ${ccrCustomAsset.type.replaceAll('_', ' ')} ${
    ccrCustomAsset.name
  } ${latestFailedAttempt} ${latestFailedAttemptTime}`;

  if (ccrCustomAsset.type === 'ingest_pipeline') {
    const installedPipeline = ingestPipelines?.[ccrCustomAsset.name];
    if (!installedPipeline) {
      if (ccrCustomAsset.is_deleted === true) {
        return {
          ...result,
          is_deleted: true,
          sync_status: SyncStatus.COMPLETED,
        };
      }
      if (latestCustomAssetError) {
        return {
          ...result,
          sync_status: SyncStatus.FAILED,
          error: latestFailedErrorMessage,
        };
      }
      return {
        ...result,
        sync_status: SyncStatus.SYNCHRONIZING,
      };
    }
    if (ccrCustomAsset.is_deleted === true && installedPipeline) {
      if (latestCustomAssetError) {
        return {
          ...result,
          is_deleted: true,
          sync_status: SyncStatus.FAILED,
          error: latestFailedErrorMessage,
        };
      }
      return {
        ...result,
        is_deleted: true,
        sync_status: SyncStatus.SYNCHRONIZING,
      };
    } else if (
      installedPipeline?.version &&
      installedPipeline.version < ccrCustomAsset.pipeline.version
    ) {
      if (latestCustomAssetError) {
        return {
          ...result,
          sync_status: SyncStatus.FAILED,
          error: latestFailedErrorMessage,
        };
      }
      return {
        ...result,
        sync_status: SyncStatus.SYNCHRONIZING,
      };
    } else if (isEqual(installedPipeline, ccrCustomAsset?.pipeline)) {
      return {
        ...result,
        sync_status: SyncStatus.COMPLETED,
      };
    } else {
      if (latestCustomAssetError) {
        return {
          ...result,
          sync_status: SyncStatus.FAILED,
          error: latestFailedErrorMessage,
        };
      }
      return {
        ...result,
        sync_status: SyncStatus.SYNCHRONIZING,
      };
    }
  } else if (ccrCustomAsset.type === 'component_template') {
    const installedCompTemplate = componentTemplates?.[ccrCustomAsset.name];
    if (!installedCompTemplate) {
      if (ccrCustomAsset.is_deleted === true) {
        return {
          ...result,
          is_deleted: true,
          sync_status: SyncStatus.COMPLETED,
        };
      }
      if (latestCustomAssetError) {
        return {
          ...result,
          sync_status: SyncStatus.FAILED,
          error: latestFailedErrorMessage,
        };
      }
      return {
        ...result,
        sync_status: SyncStatus.SYNCHRONIZING,
      };
    }
    if (ccrCustomAsset.is_deleted === true && installedCompTemplate) {
      if (latestCustomAssetError) {
        return {
          ...result,
          is_deleted: true,
          sync_status: SyncStatus.FAILED,
          error: latestFailedErrorMessage,
        };
      }
      return {
        ...result,
        is_deleted: true,
        sync_status: SyncStatus.SYNCHRONIZING,
      };
    } else if (isEqual(installedCompTemplate, ccrCustomAsset?.template)) {
      return {
        ...result,
        sync_status: SyncStatus.COMPLETED,
      };
    } else {
      if (latestCustomAssetError) {
        return {
          ...result,
          sync_status: SyncStatus.FAILED,
          error: latestFailedErrorMessage,
        };
      }
      return {
        ...result,
        sync_status: SyncStatus.SYNCHRONIZING,
      };
    }
  }
  return {} as RemoteSyncedCustomAssetsStatus;
};

export const getRemoteSyncedIntegrationsStatus = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract
): Promise<GetRemoteSyncedIntegrationsStatusResponse> => {
  const { enableSyncIntegrationsOnRemote } = appContextService.getExperimentalFeatures();
  const logger = appContextService.getLogger();

  if (!enableSyncIntegrationsOnRemote) {
    return { integrations: [] };
  }

  try {
    const followerIndexRes = await getFollowerIndexInfo(esClient, logger);
    if (followerIndexRes?.error || !followerIndexRes?.info) {
      return { error: followerIndexRes?.error, integrations: [] };
    }
    const res = await fetchAndCompareSyncedIntegrations(
      esClient,
      soClient,
      followerIndexRes.info.follower_index,
      logger
    );
    return res;
  } catch (error) {
    return { error: error.message, integrations: [] };
  }
};
