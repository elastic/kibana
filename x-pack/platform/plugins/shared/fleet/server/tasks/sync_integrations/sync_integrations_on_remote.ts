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
} from '@kbn/core/server';

import semverEq from 'semver/functions/eq';
import semverGte from 'semver/functions/gte';

import { uniq } from 'lodash';

import type { PackageClient } from '../../services';
import { outputService } from '../../services';

import { FleetError, PackageNotFoundError } from '../../errors';
import { FLEET_SYNCED_INTEGRATIONS_CCR_INDEX_PREFIX } from '../../services/setup/fleet_synced_integrations';

import { getInstallation, removeInstallation } from '../../services/epm/packages';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../constants';

import { createOrUpdateFailedInstallStatus } from '../../services/epm/packages/install_errors_helpers';

import type { InstallSource } from '../../types';

import { installCustomAsset } from './custom_assets';
import type { CustomAssetsData, SyncIntegrationsData } from './model';

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_BACKOFF_MINUTES = [5, 10, 20, 40, 60];

export const getFollowerIndex = async (
  esClient: ElasticsearchClient,
  abortController: AbortController
): Promise<string | undefined> => {
  const indices = await esClient.indices.get(
    {
      index: FLEET_SYNCED_INTEGRATIONS_CCR_INDEX_PREFIX,
      expand_wildcards: 'all',
    },
    { signal: abortController.signal }
  );

  const indexNames = Object.keys(indices);
  if (indexNames.length > 1) {
    throw new FleetError(
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
  abortController: AbortController,
  logger: Logger
): Promise<SyncIntegrationsData | undefined> => {
  const index = await getFollowerIndex(esClient, abortController);

  const response = await esClient.search(
    {
      index,
    },
    { signal: abortController.signal }
  );
  if (response.hits.hits.length === 0) {
    logger.warn(`getSyncedIntegrationsCCRDoc - Sync integration doc not found`);
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
  savedObjectsClient: SavedObjectsClientContract,
  pkg: { package_name: string; package_version: string; install_source?: InstallSource },
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
    // excluding custom and upload packages from retries
    const shouldRetryInstall =
      attempt > 0 &&
      lastRetryAttemptTime &&
      Date.now() - Date.parse(lastRetryAttemptTime) >
        RETRY_BACKOFF_MINUTES[attempt - 1] * 60 * 1000 &&
      (pkg.install_source === 'registry' || pkg.install_source === 'bundled');
    if (!shouldRetryInstall) {
      logger.debug(`installPackageIfNotInstalled - Max retry attempts reached`);
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
    if (error instanceof PackageNotFoundError && error.message.includes('not found in registry')) {
      await createOrUpdateFailedInstallStatus({
        logger,
        savedObjectsClient,
        pkgName: pkg.package_name,
        pkgVersion: pkg.package_version,
        error,
        installSource: pkg?.install_source,
      });
    }
  }
}

async function uninstallPackageIfInstalled(
  esClient: ElasticsearchClient,
  savedObjectsClient: SavedObjectsClient,
  pkg: { package_name: string; package_version: string },
  logger: Logger
) {
  const installation = await getInstallation({ savedObjectsClient, pkgName: pkg.package_name });
  if (!installation) {
    logger.warn(`uninstallPackageIfInstalled - Installation for ${pkg.package_name} not found`);
    return;
  }
  if (
    !(
      installation.install_status === 'installed' &&
      semverEq(installation.version, pkg.package_version)
    )
  ) {
    logger.warn(
      `uninstallPackageIfInstalled - Package ${pkg.package_name} cannot be uninstalled - Found status: ${installation.install_status}, version: ${installation.version} `
    );
    return;
  }

  try {
    await removeInstallation({
      savedObjectsClient,
      pkgName: pkg.package_name,
      pkgVersion: pkg.package_version,
      esClient,
      force: false,
    });
    logger.info(
      `Package ${pkg.package_name} with version ${pkg.package_version} uninstalled via integration syncing`
    );
  } catch (error) {
    logger.error(
      `Failed to uninstall package ${pkg.package_name} with version ${pkg.package_version} via integration syncing: ${error.message}`
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
  const syncIntegrationsDoc = await getSyncedIntegrationsCCRDoc(esClient, abortController, logger);

  const isSyncIntegrationsEnabled = await getSyncIntegrationsEnabled(
    soClient,
    syncIntegrationsDoc?.remote_es_hosts
  );

  if (!isSyncIntegrationsEnabled) {
    logger.debug(`Sync integration not enabled because of remote outputs configuration`);
    return;
  }

  const installedIntegrations =
    syncIntegrationsDoc?.integrations.filter(
      (integration) => integration.install_status !== 'not_installed'
    ) ?? [];
  for (const pkg of installedIntegrations) {
    if (abortController.signal.aborted) {
      throw new Error('Task was aborted');
    }
    await installPackageIfNotInstalled(soClient, pkg, packageClient, logger, abortController);
  }

  const uninstalledIntegrations =
    syncIntegrationsDoc?.integrations.filter(
      (integration) => integration.install_status === 'not_installed'
    ) ?? [];
  for (const pkg of uninstalledIntegrations) {
    if (abortController.signal.aborted) {
      throw new Error('Task was aborted');
    }
    await uninstallPackageIfInstalled(esClient, soClient, pkg, logger);
  }

  await clearCustomAssetFailedAttempts(soClient, syncIntegrationsDoc);

  for (const customAsset of Object.values(syncIntegrationsDoc?.custom_assets ?? {})) {
    if (abortController.signal.aborted) {
      throw new Error('Task was aborted');
    }
    try {
      await installCustomAsset(customAsset, esClient, abortController, logger);
    } catch (error) {
      logger.error(`Failed to install ${customAsset.type} ${customAsset.name}, error: ${error}`);
      await updateCustomAssetFailedAttempts(soClient, customAsset, error, logger);
    }
  }
};

async function clearCustomAssetFailedAttempts(
  soClient: SavedObjectsClientContract,
  syncIntegrationsDoc?: SyncIntegrationsData
) {
  const customAssetPackages = uniq(
    Object.values(syncIntegrationsDoc?.custom_assets ?? {}).map((customAsset) => {
      return customAsset.package_name;
    })
  );
  for (const pkgName of customAssetPackages) {
    await soClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
      latest_custom_asset_install_failed_attempts: {},
    });
  }
}

async function updateCustomAssetFailedAttempts(
  savedObjectsClient: SavedObjectsClientContract,
  customAsset: CustomAssetsData,
  error: Error,
  logger: Logger
) {
  try {
    await savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, customAsset.package_name, {
      latest_custom_asset_install_failed_attempts: {
        [`${customAsset.type}:${customAsset.name}`]: {
          type: customAsset.type,
          name: customAsset.name,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          created_at: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    logger.warn(`Error occurred while updating custom asset failed attempts: ${err}`);
  }
}
