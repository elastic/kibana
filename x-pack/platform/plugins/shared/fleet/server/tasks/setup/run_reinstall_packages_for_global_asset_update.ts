/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import type { Logger } from '@kbn/logging';
import pMap from 'p-map';

import { appContextService } from '../../services';
import { MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS } from '../../constants';
import { getInstallations, reinstallPackageForInstallation } from '../../services/epm/packages';

interface RunReinstallPackagesParams {
  abortController: AbortController;
  logger: Logger;
}

/**
 * Reinstalls all installed packages after global Fleet ES assets have been updated.
 * This ensures packages reference the latest global component templates and ingest pipelines.
 *
 * This task is scheduled when global assets (component templates, ingest pipelines) are
 * created or updated during Fleet setup, typically during a stack upgrade.
 */
export async function runReinstallPackagesForGlobalAssetUpdate({
  abortController,
  logger,
}: RunReinstallPackagesParams): Promise<void> {
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const esClient = appContextService.getInternalUserESClient();

  const config = appContextService.getConfig();
  const maxConcurrency =
    config?.startupOptimization?.maxConcurrentPackageOperations ??
    MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS;

  logger.info('Starting package reinstallation after global Fleet asset update');

  const installedPackages = await getInstallations(soClient);
  const installations = installedPackages.saved_objects.map((so) => so.attributes);

  if (installations.length === 0) {
    logger.debug('No packages installed, skipping reinstallation');
    return;
  }

  logger.info(`Reinstalling ${installations.length} packages after global asset changes`);

  let successCount = 0;
  let errorCount = 0;

  await pMap(
    installations,
    async (installation) => {
      if (abortController.signal.aborted) {
        return;
      }

      try {
        await reinstallPackageForInstallation({
          soClient,
          esClient,
          installation,
        });
        successCount++;
        logger.debug(`Successfully reinstalled package ${installation.name}`);
      } catch (err: any) {
        errorCount++;
        apm.captureError(err);
        logger.error(
          `Package needs to be manually reinstalled ${installation.name} after installing Fleet global assets: ${err.message}`
        );
      }
    },
    { concurrency: maxConcurrency }
  );

  if (abortController.signal.aborted) {
    logger.warn('Package reinstallation was aborted');
    return;
  }

  logger.info(
    `Completed package reinstallation after global asset update: ${successCount} succeeded, ${errorCount} failed`
  );
}
