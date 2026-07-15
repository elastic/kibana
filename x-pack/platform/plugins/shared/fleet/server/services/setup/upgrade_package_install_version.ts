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
  const outdatedInstallations = await findOutdatedInstallations(soClient);
  if (outdatedInstallations.length === 0) {
    return;
  }

  await pMap(
    outdatedInstallations,
    ({ attributes: installation }) => {
      // Uploaded package cannot be reinstalled
      return reinstallPackageForInstallation({
        soClient,
        esClient,
        installation,
      }).catch((err: Error) => {
        if (installation.install_source === 'upload') {
          logger.warn(
            `Uploaded package needs to be manually reinstalled ${installation.name}. ${err.message}`
          );
        } else {
          logger.error(
            `Package needs to be manually reinstalled ${installation.name} updating install_version failed. ${err.message}`
          );
        }
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

async function findOutdatedInstallations(soClient: SavedObjectsClientContract) {
  const res = await soClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    perPage: SO_SEARCH_LIMIT,
    filter: `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:installed`,
  });

  const currentKibanaVersion = appContextService.getKibanaVersion();

  return res.saved_objects.filter(
    ({ attributes }) =>
      isOutdatedFormatVersion(attributes) ||
      isOutdatedKibanaVersion(attributes.installed_kibana_version, currentKibanaVersion)
  );
}
