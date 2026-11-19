/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import pMap from 'p-map';
import type { Logger } from '@kbn/logging';

import {
  MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS,
  PACKAGES_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../constants';
import { FLEET_INSTALL_FORMAT_VERSION } from '../../constants/fleet_es_assets';
import type { Installation } from '../../types';

import { PackageAlreadyInstalledError, PackageNotFoundError } from '../../errors';
import { reinstallPackageForInstallation } from '../epm/packages';
import { isOutdatedKibanaVersion } from '../epm/packages/kibana_version_check';
import { appContextService } from '../app_context';

/**
 * Upgrade package install version for packages installed with an older version of Kibana,
 * or whose Kibana assets were last installed/updated on a different Kibana major.minor version
 */
export async function upgradePackageInstallVersion({
  soClient,
  esClient,
  logger,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  logger: Logger;
}) {
  const currentKibanaVersion = appContextService.getKibanaVersion();
  const outdatedInstallations = await findOutdatedInstallations(soClient, currentKibanaVersion);
  if (outdatedInstallations.length === 0) {
    return;
  }

  await pMap(
    outdatedInstallations,
    ({ id, attributes: installation }) => {
      return reinstallPackageForInstallation({
        soClient,
        esClient,
        installation,
      }).catch(async (err: Error) => {
        const isNonReinstallable =
          err instanceof PackageAlreadyInstalledError ||
          (err instanceof PackageNotFoundError && installation.install_source === 'bundled');

        if (isNonReinstallable) {
          // Package has no matching bundled/uploaded package to reinstall from. Stamp the
          // current version so it doesn't get re-selected (and re-logged) on every setup.
          await soClient.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, id, {
            installed_kibana_version: currentKibanaVersion,
            install_format_schema_version: FLEET_INSTALL_FORMAT_VERSION,
          });
          logger.warn(
            `Package needs to be manually reinstalled ${installation.name}. ${err.message}`
          );
          return;
        }

        if (installation.install_source === 'upload') {
          logger.warn(
            `Uploaded package needs to be manually reinstalled ${installation.name}. ${err.message}`
          );
          return;
        }

        logger.error(
          `Package needs to be manually reinstalled ${installation.name} updating install_version failed. ${err.message}`
        );
      });
    },
    { concurrency: MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS }
  );
}

function isOutdatedFormatVersion(installation: Installation) {
  return (
    !installation.install_format_schema_version ||
    installation.install_format_schema_version < FLEET_INSTALL_FORMAT_VERSION
  );
}

async function findOutdatedInstallations(
  soClient: SavedObjectsClientContract,
  currentKibanaVersion: string
) {
  const res = await soClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    perPage: SO_SEARCH_LIMIT,
    filter: `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:installed`,
  });

  return res.saved_objects.filter(
    ({ attributes }) =>
      isOutdatedFormatVersion(attributes) ||
      isOutdatedKibanaVersion(attributes.installed_kibana_version, currentKibanaVersion)
  );
}
