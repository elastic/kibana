/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { v4 as uuidv4 } from 'uuid';

import pMap from 'p-map';

import * as Registry from '../services/epm/registry';
import { getInstallations, getPackageKnowledgeBase } from '../services/epm/packages';
import { appContextService, licenseService } from '../services';
import { MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS } from '../constants';
import { indexKnowledgeBase } from '../services/epm/packages/install_state_machine/steps';
import { unpackBufferToAssetsMap } from '../services/epm/archive';
import { getBundledPackageForInstallation } from '../services/epm/packages/bundled_packages';
import { PACKAGES_TO_INSTALL_WITH_STREAMING } from '../services/epm/packages/install';

import { throwIfAborted } from './utils';

const TASK_TYPE = 'fleet:reindex_integration_knowledge';

export function registerReindexIntegrationKnowledgeTask(
  taskManagerSetup: TaskManagerSetupContract
) {
  taskManagerSetup.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Fleet Reindex integration knowledge',
      timeout: '5m',
      maxAttempts: 3,
      createTaskRunner: ({ abortController }: { abortController: AbortController }) => {
        return {
          async run() {
            // Check if user has appropriate license for knowledge base functionality
            if (!licenseService.isEnterprise()) {
              appContextService
                .getLogger()
                .debug(`Skipping knowledge base reindexing - requires Enterprise license`);
              return;
            }

            await reindexIntegrationKnowledgeForInstalledPackages(abortController);
          },
        };
      },
    },
  });
}

export async function scheduleReindexIntegrationKnowledgeTask(
  taskManagerStart: TaskManagerStartContract
) {
  appContextService
    .getLogger()
    .info('Scheduling task to reindex integration knowledge for installed packages');
  await taskManagerStart.ensureScheduled({
    id: `${TASK_TYPE}:${uuidv4()}`,
    scope: ['fleet'],
    params: {},
    taskType: TASK_TYPE,
    runAt: new Date(),
    state: {},
  });
}

export async function reindexIntegrationKnowledgeForInstalledPackages(
  abortController: AbortController
) {
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const esClient = appContextService.getInternalUserESClient();
  const logger = appContextService.getLogger();
  const installedPackages = await getInstallations(soClient);
  await pMap(
    installedPackages.saved_objects,
    async ({ attributes: installation }) => {
      throwIfAborted(abortController);
      const knowledgeBase = await getPackageKnowledgeBase({
        esClient,
        pkgName: installation.name,
        abortController,
      });
      const everyKnowledgeBaseOnCurrentPackageVersion = knowledgeBase?.items.every(
        (item) => item.version === installation.version
      );
      if (everyKnowledgeBaseOnCurrentPackageVersion) {
        logger.debug(
          `Skipping reindexing knowledge base for package ${installation.name}@${installation.version} - already indexed`
        );
        return;
      }

      let archiveIterator;
      if (installation.install_source === 'bundled') {
        const matchingBundledPackage = await getBundledPackageForInstallation(installation);
        if (!matchingBundledPackage) {
          logger.debug(
            `Skipping reindexing knowledge base for package ${installation.name}@${installation.version} - bundled package not found`
          );
          return;
        }
        const useStreaming = PACKAGES_TO_INSTALL_WITH_STREAMING.includes(installation.name);
        const archiveBuffer = await matchingBundledPackage.getBuffer();
        ({ archiveIterator } = await unpackBufferToAssetsMap({
          archiveBuffer,
          contentType: 'application/zip',
          useStreaming,
        }));
      } else if (installation.install_source !== 'registry') {
        logger.debug(
          `Skipping reindexing knowledge base for package ${installation.name}@${installation.version} - install source ${installation.install_source}`
        );
        return;
      }
      if (installation.install_source === 'registry') {
        ({ archiveIterator } = await Registry.getPackage(installation.name, installation.version, {
          useStreaming: true,
        }));
      }
      await indexKnowledgeBase(
        installation.installed_es,
        soClient,
        esClient,
        logger,
        { name: installation.name, version: installation.version },
        archiveIterator!,
        abortController
      ).catch((error) => {
        logger.error(
          `Failed reindexing knowledge base for package ${installation.name}@${installation.version}: ${error}`
        );
      });
    },
    { concurrency: MAX_CONCURRENT_EPM_PACKAGES_INSTALLATIONS }
  );
}
