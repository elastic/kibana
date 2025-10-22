/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClient, type CoreStart, type Logger } from '@kbn/core/server';
import {
  TaskStatus,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import { CASE_SAVED_OBJECT, CASE_ID_INCREMENTER_SAVED_OBJECT } from '../../../common/constants';
import { CasesIncrementalIdService } from '../../services/incremental_id';
import type { ConfigType } from '../../config';

export const CASES_INCREMENTAL_ID_SYNC_TASK_TYPE = 'cases_incremental_id_assignment';
export const CASES_INCREMENTAL_ID_SYNC_TASK_ID = `cases:${CASES_INCREMENTAL_ID_SYNC_TASK_TYPE}`;

export const CasesIncrementIdTaskVersion = '1.0.0';

export class IncrementalIdTaskManager {
  private config: ConfigType['incrementalId'];
  private logger: Logger;
  private internalSavedObjectsClient?: SavedObjectsClient;
  private taskManager?: TaskManagerStartContract;
  private successErrorUsageCounter?: IUsageCounter;
  constructor(
    taskManager: TaskManagerSetupContract,
    config: ConfigType['incrementalId'],
    logger: Logger,
    usageCollection?: UsageCollectionSetup
  ) {
    this.config = config;
    this.logger = logger.get('incremental_id_task');
    this.logger.info('Registering Case Incremental ID Task Manager');

    if (usageCollection) {
      this.successErrorUsageCounter = usageCollection?.createUsageCounter('CasesIncrementalId');
    }

    taskManager.registerTaskDefinitions({
      [CASES_INCREMENTAL_ID_SYNC_TASK_TYPE]: {
        title: 'Cases Numerical ID assignment',
        description: 'Applying incremental numeric ids to cases',
        timeout: '10m',
        createTaskRunner: () => {
          if (!this.internalSavedObjectsClient) {
            throw new Error('Missing internal saved objects client.');
          }
          const casesIncrementService = new CasesIncrementalIdService(
            this.internalSavedObjectsClient,
            this.logger
          );
          return {
            run: async () => {
              const initializedTime = new Date().toISOString();
              const startTime = performance.now();
              this.logger.debug(`Increment id task started at: ${initializedTime}`);

              casesIncrementService.startService();

              // Fetch all cases without an incremental id
              const casesWithoutIncrementalIdResponse =
                await casesIncrementService.getCasesWithoutIncrementalId();
              const { saved_objects: casesWithoutIncrementalId } =
                casesWithoutIncrementalIdResponse;

              this.logger.debug(
                `${casesWithoutIncrementalId.length} cases without incremental ids`
              );

              try {
                // Increment the case ids
                const processedAmount = await casesIncrementService.incrementCaseIds(
                  casesWithoutIncrementalId
                );
                this.logger.debug(
                  `Applied incremental ids to ${processedAmount} out of ${casesWithoutIncrementalId.length} cases`
                );

                const endTime = performance.now();
                this.logger.debug(
                  `Task terminated ${CASES_INCREMENTAL_ID_SYNC_TASK_ID}. Task run took ${
                    endTime - startTime
                  }ms [ started: ${initializedTime}, ended: ${new Date().toISOString()} ]`
                );
                this.successErrorUsageCounter?.incrementCounter({
                  counterName: 'incrementIdTaskSuccess',
                  incrementBy: 1,
                });
              } catch (_) {
                this.successErrorUsageCounter?.incrementCounter({
                  counterName: 'incrementIdTaskError',
                  incrementBy: 1,
                });
              }
            },
            cancel: async () => {
              casesIncrementService.stopService();
              this.logger.debug(`${CASES_INCREMENTAL_ID_SYNC_TASK_ID} task run was canceled`);
            },
          };
        },
      },
    });
  }

  public async setupIncrementIdTask(taskManager: TaskManagerStartContract, core: CoreStart) {
    this.taskManager = taskManager;

    // Instantiate saved objects client
    const internalSavedObjectsRepository = core.savedObjects.createInternalRepository([
      CASE_SAVED_OBJECT,
      CASE_ID_INCREMENTER_SAVED_OBJECT,
    ]);
    this.internalSavedObjectsClient = new SavedObjectsClient(internalSavedObjectsRepository);

    try {
      const taskDoc = await this.taskManager.get(CASES_INCREMENTAL_ID_SYNC_TASK_ID);
      const scheduledToRunInTheFuture = taskDoc.runAt.getTime() >= new Date().getTime();
      const running =
        taskDoc.status === TaskStatus.Claiming || taskDoc.status === TaskStatus.Running;
      if (scheduledToRunInTheFuture || running) {
        this.logger.info(
          `${CASES_INCREMENTAL_ID_SYNC_TASK_ID} is already ${
            scheduledToRunInTheFuture
              ? `scheduled (time: ${taskDoc.runAt})`
              : `running (status: ${taskDoc.status})`
          }. No need to schedule it again.`
        );
        return;
      }
    } catch (e) {
      this.logger.warn(
        `Could not check status of ${CASES_INCREMENTAL_ID_SYNC_TASK_ID}, will continue scheduling it.`
      );
    }

    this.taskManager
      .ensureScheduled({
        id: CASES_INCREMENTAL_ID_SYNC_TASK_ID,
        taskType: CASES_INCREMENTAL_ID_SYNC_TASK_TYPE,
        // start delayed to give the system some time to start up properly
        runAt: new Date(new Date().getTime() + this.config.taskStartDelayMinutes * 60 * 1000),
        schedule: {
          interval: `${this.config.taskIntervalMinutes}m`,
        },
        params: {},
        state: {},
        scope: ['cases'],
      })
      .then(
        (taskInstance) => {
          this.logger.info(
            `${CASES_INCREMENTAL_ID_SYNC_TASK_ID} scheduled with interval ${taskInstance.schedule?.interval}`
          );
        },
        (e) => {
          this.logger.error(
            `Error scheduling task: ${CASES_INCREMENTAL_ID_SYNC_TASK_ID}: ${e}`,
            e?.message ?? e
          );
        }
      );
  }
}
