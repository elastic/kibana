/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, SavedObjectsClient, type Logger } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup, UsageCounter } from '@kbn/usage-collection-plugin/server';
import {
  CASES_INCREMENTAL_ID_SYNC_TASK_ID,
  CASES_INCREMENTAL_ID_SYNC_TASK_TYPE,
  CASE_ID_INCREMENTER_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
} from '../../../common/constants';
import { CasesIncrementalIdService } from '../../services/incremental_id';

export function registerIncrementalIdTask(
  core: CoreSetup,
  taskManager: TaskManagerSetupContract,
  loggerParent: Logger,
  usageCollection?: UsageCollectionSetup
) {
  let successErrorUsageCounter: UsageCounter | undefined;
  const logger = loggerParent.get('incremental_id_task');
  logger.info('Registering Case Incremental ID Task Manager');

  if (usageCollection) {
    successErrorUsageCounter = usageCollection?.createUsageCounter('CasesIncrementalId');
  }

  taskManager.registerTaskDefinitions({
    [CASES_INCREMENTAL_ID_SYNC_TASK_TYPE]: {
      title: 'Cases Numerical ID assignment',
      description: 'Applying incremental numeric ids to cases',
      timeout: '10m',
      createTaskRunner: () => {
        // Reference is used to stop the service when the task is cancelled
        let casesIncrementService: CasesIncrementalIdService | undefined;

        return {
          run: async () => {
            const [coreStart] = await core.getStartServices();
            const internalSavedObjectsRepository = coreStart.savedObjects.createInternalRepository([
              CASE_SAVED_OBJECT,
              CASE_ID_INCREMENTER_SAVED_OBJECT,
            ]);
            const internalSavedObjectsClient = new SavedObjectsClient(
              internalSavedObjectsRepository
            );
            casesIncrementService = new CasesIncrementalIdService(
              internalSavedObjectsClient,
              logger
            );
            const initializedTime = new Date().toISOString();
            const startTime = performance.now();
            logger.debug(`Increment id task started at: ${initializedTime}`);

            casesIncrementService.startService();

            // Fetch all cases without an incremental id
            const casesWithoutIncrementalIdResponse =
              await casesIncrementService.getCasesWithoutIncrementalId();
            const { saved_objects: casesWithoutIncrementalId } = casesWithoutIncrementalIdResponse;

            logger.debug(`${casesWithoutIncrementalId.length} cases without incremental ids`);

            try {
              // Increment the case ids
              const processedAmount = await casesIncrementService.incrementCaseIds(
                casesWithoutIncrementalId
              );
              logger.debug(
                `Applied incremental ids to ${processedAmount} out of ${casesWithoutIncrementalId.length} cases`
              );

              const endTime = performance.now();
              logger.debug(
                `Task terminated ${CASES_INCREMENTAL_ID_SYNC_TASK_ID}. Task run took ${
                  endTime - startTime
                }ms [ started: ${initializedTime}, ended: ${new Date().toISOString()} ]`
              );
              successErrorUsageCounter?.incrementCounter({
                counterName: 'incrementIdTaskSuccess',
                incrementBy: 1,
              });
            } catch (_) {
              successErrorUsageCounter?.incrementCounter({
                counterName: 'incrementIdTaskError',
                incrementBy: 1,
              });
            }
          },
          cancel: async () => {
            casesIncrementService?.stopService();
            logger.debug(`${CASES_INCREMENTAL_ID_SYNC_TASK_ID} task run was canceled`);
          },
        };
      },
    },
  });
}
