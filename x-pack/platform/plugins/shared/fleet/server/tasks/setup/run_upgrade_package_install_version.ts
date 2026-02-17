/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import pMap from 'p-map';

import { appContextService } from '../../services';
import {
  MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS,
  PACKAGES_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../constants';
import { FLEET_INSTALL_FORMAT_VERSION } from '../../constants/fleet_es_assets';
import type { Installation } from '../../types';

import { reinstallPackageForInstallation } from '../../services/epm/packages';

interface RunUpgradePackageInstallVersionParams {
  abortController: AbortController;
  logger: Logger;
}

/**
 * Deferred task to upgrade package install versions for packages installed with an older version of Kibana.
 */
export async function runUpgradePackageInstallVersion({
  abortController,
  logger,
}: RunUpgradePackageInstallVersionParams): Promise<void> {
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const esClient = appContextService.getInternalUserESClient();

  const config = appContextService.getConfig();
  const maxConcurrency =
    config?.startupOptimization?.maxConcurrentPackageOperations ??
    MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS;
  const batchSize = config?.startupOptimization?.packageUpgradeBatchSize ?? 50;

  logger.info('Starting deferred package install version upgrade');

  // Find outdated installations
  const res = await soClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    perPage: SO_SEARCH_LIMIT,
    filter: `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:installed and (${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_format_schema_version < ${FLEET_INSTALL_FORMAT_VERSION} or not ${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_format_schema_version:*)`,
  });

  if (res.total === 0) {
    logger.debug('No packages require install version upgrade');
    return;
  }

  logger.info(`Found ${res.total} packages requiring install version upgrade`);

  const savedObjects = res.saved_objects;
  for (let i = 0; i < savedObjects.length; i += batchSize) {
    if (abortController.signal.aborted) {
      logger.warn('Package install version upgrade was aborted');
      return;
    }

    const batch = savedObjects.slice(i, i + batchSize);
    logger.debug(
      `Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(
        savedObjects.length / batchSize
      )}`
    );

    await pMap(
      batch,
      async ({ attributes: installation }) => {
        if (abortController.signal.aborted) {
          return;
        }

        try {
          await reinstallPackageForInstallation({
            soClient,
            esClient,
            installation,
          });
          logger.debug(`Successfully upgraded package install version for ${installation.name}`);
        } catch (err: any) {
          if (installation.install_source === 'upload') {
            logger.warn(
              `Uploaded package needs to be manually reinstalled ${installation.name}. ${err.message}`
            );
          } else {
            logger.error(
              `Package needs to be manually reinstalled ${installation.name} updating install_version failed. ${err.message}`
            );
          }
        }
      },
      { concurrency: maxConcurrency }
    );
  }

  logger.info('Completed deferred package install version upgrade');
}
