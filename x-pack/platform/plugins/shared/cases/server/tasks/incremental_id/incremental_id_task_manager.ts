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
import { CASE_SAVED_OBJECT, CASE_ID_INCREMENTER_SAVED_OBJECT } from '../../../common/constants';
import { CasesIncrementalIdService } from '../../services/incremental_id';

export const CASES_INCREMENTAL_ID_SYNC_TASK_TYPE = 'cases_incremental_id_assignment';
export const CASES_INCREMENTAL_ID_SYNC_TASK_ID = `Cases:${CASES_INCREMENTAL_ID_SYNC_TASK_TYPE}`;

export const CasesIncrementIdTaskVersion = '1.0.0';
const CASES_INCREMENTAL_ID_SYNC_INTERVAL_DEFAULT = '1m';

export class IncrementalIdTaskManager {
  private logger: Logger;
  private casesIncrementService?: CasesIncrementalIdService;
  private taskManager?: TaskManagerStartContract;

  constructor(taskManager: TaskManagerSetupContract, logger: Logger) {
    this.logger = logger.get('incremental_id_task');
    this.logger.info('Registering Case Incremental ID Task Manager');

    taskManager.registerTaskDefinitions({
      [CASES_INCREMENTAL_ID_SYNC_TASK_TYPE]: {
        title: 'Cases Numerical ID assignment',
        description: 'Applying incremental numeric ids to cases',
        // timeout: '10s',
        createTaskRunner: () => {
          return {
            run: async () => {
              const initializedTime = new Date().toISOString();
              const startTime = performance.now();
              this.logger.debug(`Increment id task started at: ${initializedTime}`);
              if (!this.casesIncrementService) {
                this.logger.error('Missing increment service necessary for task');
                return undefined;
              }
              this.casesIncrementService.startService();

              // Fetch all cases without an incremental id
              const casesWithoutIncrementalIdResponse =
                await this.casesIncrementService.getCasesWithoutIncrementalId();
              const { saved_objects: casesWithoutIncrementalId } =
                casesWithoutIncrementalIdResponse;

              this.logger.debug(
                `${casesWithoutIncrementalId.length} cases without incremental ids`
              );
              // Increment the case ids
              const processedAmount = await this.casesIncrementService.incrementCaseIds(
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
            },
            cancel: async () => {
              this.casesIncrementService?.stopService();
              this.logger.debug(`${CASES_INCREMENTAL_ID_SYNC_TASK_ID} task run was canceled`);
            },
          };
        },
      },
    });
  }

  public async setupIncrementIdTask(taskManager: TaskManagerStartContract, core: CoreStart) {
    this.taskManager = taskManager;
    try {
      // Instantiate saved objects client
      const internalSavedObjectsRepository = core.savedObjects.createInternalRepository([
        CASE_SAVED_OBJECT,
        CASE_ID_INCREMENTER_SAVED_OBJECT,
      ]);
      const internalSavedObjectsClient = new SavedObjectsClient(internalSavedObjectsRepository);

      this.casesIncrementService = new CasesIncrementalIdService(
        internalSavedObjectsClient,
        this.logger
      );

      const taskInstance = await this.taskManager.ensureScheduled({
        id: CASES_INCREMENTAL_ID_SYNC_TASK_ID,
        taskType: CASES_INCREMENTAL_ID_SYNC_TASK_TYPE,
        schedule: {
          interval: CASES_INCREMENTAL_ID_SYNC_INTERVAL_DEFAULT,
        },
        params: {},
        state: {},
        scope: ['cases'],
      });

      this.logger.info(
        `${CASES_INCREMENTAL_ID_SYNC_TASK_ID} scheduled with interval ${taskInstance.schedule?.interval}`
      );
    } catch (e) {
      this.logger.error(
        `Error running task: ${CASES_INCREMENTAL_ID_SYNC_TASK_ID}: ${e}`,
        e?.message ?? e
      );
      return null;
    }
  }

  /**
   * Ensure the id incrementer task is running soon
   */
  public async scheduleIdCrementerTask() {
    try {
      const taskInstance = await this.taskManager?.get(CASES_INCREMENTAL_ID_SYNC_TASK_ID);
      if (taskInstance?.status === TaskStatus.Idle) {
        await this.taskManager?.runSoon(CASES_INCREMENTAL_ID_SYNC_TASK_ID);
      }
    } catch (e) {
      this.logger.debug(`Could not run task: ${e}`);
    }
  }
}
