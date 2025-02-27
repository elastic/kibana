/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClient, Logger } from '@kbn/core/server';

import semverGte from 'semver/functions/gte';

import type { PackageClient } from '../services';
import { outputService } from '../services';

import { PackageNotFoundError } from '../errors';

import type { SyncIntegrationsData } from './sync_integrations_task';

const FLEET_SYNCED_INTEGRATIONS_CCR_INDEX_PREFIX = 'fleet-synced-integrations-ccr-*';

const getSyncedIntegrationsCCRDoc = async (
  esClient: ElasticsearchClient,
  abortController: AbortController
): Promise<SyncIntegrationsData | undefined> => {
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

  const response = await esClient.search(
    {
      index: indexNames[0],
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
  logger: Logger
) {
  const installation = await packageClient.getInstallation(pkg.package_name);
  if (
    installation &&
    installation.install_status === 'installed' &&
    semverGte(installation.version, pkg.package_version)
  ) {
    logger.debug(
      `Package ${pkg.package_name} already installed with version ${pkg.package_version}`
    );
    return;
  }
  if (installation && installation.install_status === 'install_failed') {
    // TODO retry
    logger.debug(`Package ${pkg.package_name} install failed on version ${installation.version}`);
  }

  try {
    const installResult = await packageClient.installPackage({
      pkgName: pkg.package_name,
      pkgVersion: pkg.package_version,
    });
    if (installResult.status === 'installed') {
      logger.info(`Package ${pkg.package_name} installed with version ${pkg.package_version}`);
    }
    if (installResult.error instanceof PackageNotFoundError) {
      logger.warn(
        `Package ${pkg.package_name} with version ${pkg.package_version} not found, trying to install latest version`
      );
      const installLatestResult = await packageClient.installPackage({
        pkgName: pkg.package_name,
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
    await installPackageIfNotInstalled(pkg, packageClient, logger);
  }
};
