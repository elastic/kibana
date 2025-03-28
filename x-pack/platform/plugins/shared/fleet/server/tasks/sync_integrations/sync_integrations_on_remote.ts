/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  SavedObjectsClient,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core/server';

import semverGte from 'semver/functions/gte';

import type { PackageClient } from '../../services';
import { outputService, appContextService } from '../../services';
import { getPackageSavedObjects } from '../../services/epm/packages/get';

import { PackageNotFoundError, IndexNotFoundError } from '../../errors';
import { FLEET_SYNCED_INTEGRATIONS_CCR_INDEX_PREFIX } from '../../services/setup/fleet_synced_integrations';

import type { Installation } from '../../types';

import type { RemoteSyncedIntegrationsStatus, GetRemoteSyncedIntegrationsStatusResponse, SyncStatus } from '../../../common/types';

import type { SyncIntegrationsData } from './model';
import { installCustomAsset } from './custom_assets';
import { CcrFollowInfoFollowerIndex } from '@elastic/elasticsearch/lib/api/types';

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_BACKOFF_MINUTES = [5, 10, 20, 40, 60];

const getFollowerIndex = async (
  esClient: ElasticsearchClient,
  abortController: AbortController
): Promise<string | undefined> => {
  const indices = await esClient.indices.get(
    {
      index: FLEET_SYNCED_INTEGRATIONS_CCR_INDEX_PREFIX,
    },
    { signal: abortController.signal }
  );

  const indexNames = Object.keys(indices);

  if (indexNames.length > 1) {
    throw new Error(
      `Not supported to sync multiple indices with prefix ${FLEET_SYNCED_INTEGRATIONS_CCR_INDEX_PREFIX}`
    );
  }

  if (indexNames.length === 0) {
    return undefined;
  }
  return indexNames[0];
};

const getSyncedIntegrationsCCRDoc = async (
  esClient: ElasticsearchClient,
  abortController: AbortController
): Promise<SyncIntegrationsData | undefined> => {
  const index = await getFollowerIndex(esClient, abortController);

  const response = await esClient.search(
    {
      index,
    },
    { signal: abortController.signal }
  );
  if (response.hits.hits.length === 0) {
    return undefined;
  }
  return response.hits.hits[0]._source as SyncIntegrationsData;
};

async function getSyncIntegrationsEnabled(
  soClient: SavedObjectsClient,
  remoteEsHosts: SyncIntegrationsData['remote_es_hosts'] | undefined
): Promise<boolean> {
  const outputs = await outputService.list(soClient);
  const esHosts = outputs.items
    .filter((output) => output.type === 'elasticsearch')
    .flatMap((output) => output.hosts);

  const isSyncIntegrationsEnabled = remoteEsHosts?.some((remoteEsHost) => {
    return (
      remoteEsHost.sync_integrations && remoteEsHost.hosts.some((host) => esHosts.includes(host))
    );
  });
  return isSyncIntegrationsEnabled ?? false;
}

async function installPackageIfNotInstalled(
  pkg: { package_name: string; package_version: string },
  packageClient: PackageClient,
  logger: Logger,
  abortController: AbortController
) {
  const installation = await packageClient.getInstallation(pkg.package_name);
  if (
    installation?.install_status === 'installed' &&
    semverGte(installation.version, pkg.package_version)
  ) {
    logger.debug(`installPackageIfNotInstalled - ${pkg.package_name} already installed`);
    return;
  }

  if (installation?.install_status === 'installing') {
    logger.debug(`installPackageIfNotInstalled - ${pkg.package_name} status installing`);
    return;
  }

  if (installation?.install_status === 'install_failed') {
    const attempt = installation.latest_install_failed_attempts?.length ?? 0;

    if (attempt >= MAX_RETRY_ATTEMPTS) {
      logger.debug(
        `installPackageIfNotInstalled - too many retry attempts at installing ${pkg.package_name}`
      );
      return;
    }
    const lastRetryAttemptTime = installation.latest_install_failed_attempts?.[0].created_at;
    // retry install if backoff time has passed since the last attempt
    const shouldRetryInstall =
      attempt > 0 &&
      lastRetryAttemptTime &&
      Date.now() - Date.parse(lastRetryAttemptTime) >
        RETRY_BACKOFF_MINUTES[attempt - 1] * 60 * 1000;

    if (!shouldRetryInstall) {
      return;
    }
  }

  try {
    const installResult = await packageClient.installPackage({
      pkgName: pkg.package_name,
      pkgVersion: pkg.package_version,
      keepFailedInstallation: true,
      // using force flag because the package version might not be the latest on this cluster
      force: true,
    });
    if (installResult.status === 'installed') {
      logger.info(`Package ${pkg.package_name} installed with version ${pkg.package_version}`);
    }
    if (installResult.error instanceof PackageNotFoundError) {
      if (abortController.signal.aborted) {
        throw new Error('Task was aborted');
      }
      logger.warn(
        `Package ${pkg.package_name} with version ${pkg.package_version} not found, trying to install latest version`
      );
      const installLatestResult = await packageClient.installPackage({
        pkgName: pkg.package_name,
        keepFailedInstallation: true,
        force: true,
      });
      if (installLatestResult.status === 'installed') {
        logger.info(`Package ${pkg.package_name} installed with version ${pkg.package_version}`);
      }
    }
  } catch (error) {
    logger.error(
      `Failed to install package ${pkg.package_name} with version ${pkg.package_version}, error: ${error}`
    );
  }
}

export const syncIntegrationsOnRemote = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClient,
  packageClient: PackageClient,
  abortController: AbortController,
  logger: Logger
) => {
  const syncIntegrationsDoc = await getSyncedIntegrationsCCRDoc(esClient, abortController);

  const isSyncIntegrationsEnabled = await getSyncIntegrationsEnabled(
    soClient,
    syncIntegrationsDoc?.remote_es_hosts
  );

  if (!isSyncIntegrationsEnabled) {
    return;
  }

  for (const pkg of syncIntegrationsDoc?.integrations ?? []) {
    if (abortController.signal.aborted) {
      throw new Error('Task was aborted');
    }
    await installPackageIfNotInstalled(pkg, packageClient, logger, abortController);
  }

  for (const customAsset of Object.values(syncIntegrationsDoc?.custom_assets ?? {})) {
    if (abortController.signal.aborted) {
      throw new Error('Task was aborted');
    }
    try {
      await installCustomAsset(customAsset, esClient, abortController, logger);
    } catch (error) {
      logger.error(`Failed to install ${customAsset.type} ${customAsset.name}, error: ${error}`);
    }
  }
};

export const getFollowerIndexInfo = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<{info?: CcrFollowInfoFollowerIndex, error?: string}> => {
  try {
    const index = await getFollowerIndex(esClient, new AbortController());
    if (!index) {
      return {error: `Follower index not found`};
    }
    const res = await esClient.ccr.followInfo({
      index,
    });
    if (!res?.follower_indices || res.follower_indices.length === 0)
      return {error: `Follower index ${index} not available`};

    if (res.follower_indices[0]?.status === 'paused') {
      return {error: `Follower index ${index} paused`};
    }
    return {info: res.follower_indices[0]};
  } catch (err) {
    if (err?.body?.error?.type === 'index_not_found_exception')
      throw new IndexNotFoundError(`Index not found`);

    logger.error('error', err.message);
    throw err;
  }
};

export const fetchAndCompareSyncedIntegrations = async (
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClientContract,
  index: string,
  logger: Logger
) => {
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
        items: [],
        error: `No integrations found on ${index}`
      }
    }
    const ccrIntegrations = searchRes.hits.hits[0]?._source?.integrations;

    // find integrations installed on remote
    const installedIntegrations = await getPackageSavedObjects(savedObjectsClient);

    if (!installedIntegrations && ccrIntegrations.length > 0) {
      return {
        items: [],
        error: `No integrations installed on remote`
      }
    }

    const installedIntegrationsByName = (installedIntegrations?.saved_objects || []).reduce(
      (acc, integration) => {
        if (integration?.id) {
          acc[integration.id] = integration;
        }
        return acc;
      },
      {} as Record<string, SavedObjectsFindResult<Installation>>
    );

    const integrationsStatus: RemoteSyncedIntegrationsStatus[] | undefined = ccrIntegrations?.map(
      (ccrIntegration) => {
        const localIntegrationSO = installedIntegrationsByName[ccrIntegration.package_name];
        if (!localIntegrationSO) {
          return {
            ...ccrIntegration,
            sync_status: 'failed' as SyncStatus.FAILED,
            error: `Installation not found`,
          };
        }
        if (ccrIntegration.package_version !== localIntegrationSO?.attributes.version) {
          return {
            ...ccrIntegration,
            sync_status: 'failed' as SyncStatus.FAILED,
            error: `Installed version: ${localIntegrationSO?.attributes.version}`,
          };
        }
        if (localIntegrationSO?.attributes.install_status !== 'installed') {
          return {
            ...ccrIntegration,
            sync_status: 'failed' as SyncStatus.FAILED,
            error: `Installation status: ${localIntegrationSO?.attributes.install_status}`,
          };
        }
        return {
          ...ccrIntegration,
          sync_status: 'completed' as SyncStatus.COMPLETED,
          updated_at: localIntegrationSO?.updated_at,
        };
      }
    );
    return {items: integrationsStatus};
  } catch (err) {
    logger.error('error', err.message);
    throw err;
  }
};

export const getRemoteSyncedIntegrationsStatus = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
): Promise<GetRemoteSyncedIntegrationsStatusResponse> => {
  const { enableSyncIntegrationsOnRemote } = appContextService.getExperimentalFeatures();
  const logger = appContextService.getLogger();

  if (!enableSyncIntegrationsOnRemote) {
    return { items: [] };
  }

  try {
    const followerIndexRes = await getFollowerIndexInfo(esClient, logger);
    if (followerIndexRes?.error || !followerIndexRes?.info) {
      return { error: followerIndexRes?.error, items: [] };
    }
    const res = await fetchAndCompareSyncedIntegrations(esClient, soClient, followerIndexRes.info.follower_index, logger);
    return res;
  } catch (err) {
    throw err;
  }
};
