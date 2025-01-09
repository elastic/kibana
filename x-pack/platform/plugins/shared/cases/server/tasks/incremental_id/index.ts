/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsClient, type CoreStart, type Logger } from '@kbn/core/server';
import type { TaskInstance, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { TaskInstanceWithId } from '@kbn/task-manager-plugin/server/task';
import type { CasesServerSetupDependencies } from '../../types';
import { CASE_SAVED_OBJECT, CASE_ID_INCREMENTER_SAVED_OBJECT } from '../../../common/constants';
import type { CasesIncrementIdTaskState, CasesIncrementIdTaskStateSchemaV1 } from './state';
import { casesIncrementIdStateSchemaByVersion } from './state';
import { CasesIncrementalIdService } from '../../services/incremental_id';

export const CASES_INCREMENTAL_ID_SYNC_TASK_TYPE = 'cases_incremental_id';
export const CASES_INCREMENTAL_ID_SYNC_TASK_ID = `Cases:${CASES_INCREMENTAL_ID_SYNC_TASK_TYPE}`;

export const CasesIncrementIdTaskVersion = '1.0.0';
const CASES_INCREMENTAL_ID_SYNC_INTERVAL_DEFAULT = '1m';

export class CasesIdIncrementerTask {
  private logger: Logger;
  private namespaces: Set<string> = new Set([DEFAULT_SPACE_ID]);
  private taskManager?: TaskManagerStartContract;
  private taskInstance?: TaskInstanceWithId;
  private casesIncrementService?: CasesIncrementalIdService;

  constructor(plugins: CasesServerSetupDependencies, logger: Logger) {
    this.logger = logger.get('cases', 'incremental_id_task');
    this.logger.info('Registering Case Incremental ID Task');

    if (plugins.taskManager) {
      plugins.taskManager.registerTaskDefinitions({
        [CASES_INCREMENTAL_ID_SYNC_TASK_TYPE]: {
          title: 'Cases Numerical ID Incrementer',
          description: 'Applying an incremental numeric id to cases',
          stateSchemaByVersion: casesIncrementIdStateSchemaByVersion,
          createTaskRunner: ({ taskInstance }) => {
            return {
              run: async () => {
                const initializedTime = new Date().toISOString();
                const startTime = performance.now();
                this.logger.info(`Increment id task started at: ${initializedTime}`);
                if (!this.casesIncrementService) {
                  this.logger.error('Missing increment service necessary for task');
                  return undefined;
                }
                if (taskInstance.state?.namespaces) {
                  // Make sure namespaces are up to date in case of a server restart
                  // TODO: potentially only use task state
                  const stateNamespaces = taskInstance.state.namespaces;
                  const currentNamespaces = Array.from(this.namespaces);
                  this.namespaces = new Set([...stateNamespaces, ...currentNamespaces]);
                }
                this.taskInstance = taskInstance;
                const currentState = this.taskInstance.state as CasesIncrementIdTaskStateSchemaV1;

                // For potential telemetry purposes
                let initialCasesCountLackingId = 0;

                // TODO: In the case of a server restart as well, we can end up in a scenario where new ID's have been applied,
                // BUT HAVE NOT BEEN SAVED TO THE TASK STATE, SO THE BEST OPTION HERE MAY BE TO JUST RETRIEVE THE HIGHEST NUMBER
                // FROM EACH SPACE rather than relying on state like the below code?

                // const lastIdByNameSpace: Record<string, number> =
                //   currentState.last_update.last_id_by_namespace ?? {};

                const lastIdByNameSpace = await this.casesIncrementService.getLastAppliedIdPerSpace(
                  Array.from(this.namespaces)
                );

                // TODO: This step _could_ be parallelized, but would be additional unnecessary memory load
                for await (const namespace of this.namespaces) {
                  const casesWithoutIncrementalIdResponse =
                    await this.casesIncrementService.getCases({
                      filter: CasesIncrementalIdService.incrementalIdMissingFilter,
                      namespaces: [namespace],
                    });

                  initialCasesCountLackingId =
                    initialCasesCountLackingId + casesWithoutIncrementalIdResponse.total;

                  const initialLastAppliedId = lastIdByNameSpace[namespace];
                  const latestIdToReinitializeWith = initialLastAppliedId
                    ? initialLastAppliedId + 1
                    : undefined;

                  const { saved_objects: casesWithoutIncrementalId } =
                    casesWithoutIncrementalIdResponse;

                  // Option 1 - Update the values sequentially (much slower, but more reliable)
                  // await this.casesIncrementService.incrementCaseIdSequentially(
                  //   casesWithoutIncrementalId,
                  //   namespace,
                  //   latestIdToReinitializeWith
                  // );

                  // Option 2 - Update the values in parallel (faster, less reliable, more memory)
                  await this.casesIncrementService.incrementCaseIdInParallel(
                    casesWithoutIncrementalId,
                    namespace,
                    latestIdToReinitializeWith
                  );
                }

                const endTime = performance.now();
                this.logger.info(`Increment id task ended at: ${new Date().toISOString()}`);

                this.logger.debug(
                  `Completed ${CASES_INCREMENTAL_ID_SYNC_TASK_ID} . Task run took ${
                    endTime - startTime
                  }ms [ stated: ${initializedTime} ]`
                );

                const newState = structuredClone(currentState);
                return {
                  state: {
                    ...newState,
                    namespaces: Array.from(this.namespaces),
                    last_update: {
                      timestamp: startTime,
                      unincremented_cases_count: initialCasesCountLackingId,
                      conflict_retry_count: 0,
                    },
                  },
                };
              },
              cancel: async () => {
                this.logger.info('Incremental ID task run was canceled');
              },
            };
          },
        },
      });
    }
  }

  private updateTaskState(newState: Partial<CasesIncrementIdTaskStateSchemaV1>) {
    if (this.taskManager) {
      this.taskManager?.bulkUpdateState([CASES_INCREMENTAL_ID_SYNC_TASK_ID], (_state) => {
        const clonedState = structuredClone(this.taskInstance?.state) ?? {};
        return {
          ...clonedState,
          ...newState,
        };
      });
    }
  }

  public addNamespace(namespace?: string) {
    if (namespace) {
      this.namespaces.add(namespace);
      const newNamespaces = Array.from(this.namespaces);
      this.updateTaskState({ namespaces: newNamespaces });
    }
  }

  public removeNamespace(namespace?: string) {
    if (namespace && this.namespaces.has(namespace)) {
      this.namespaces.delete(namespace);
      const newNamespaces = Array.from(this.namespaces);
      this.updateTaskState({ namespaces: newNamespaces });
    }
  }

  public async scheduleIncrementIdTask(
    taskManager: TaskManagerStartContract,
    core: CoreStart
  ): Promise<TaskInstance | null> {
    try {
      if (!taskManager) {
        this.logger.error(
          `Error running task: ${CASES_INCREMENTAL_ID_SYNC_TASK_ID}. Missing task manager service`
        );
        return null;
      }

      // TODO: REMOVE as this removes the existing state we want to keep, but good for testing cleanup
      // await taskManager.removeIfExists(CASES_INCREMENTAL_ID_SYNC_TASK_ID);

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

      const casesWithoutIncrementalId = await this.casesIncrementService.getCases({
        perPage: 1,
        filter: CasesIncrementalIdService.incrementalIdMissingFilter,
        namespaces: ['*'],
      });

      const initializedTime = new Date().getTime();

      const initialTaskState: CasesIncrementIdTaskState = {
        namespaces: Array.from(this.namespaces),
        on_initialization: {
          timestamp: initializedTime,
          unincremented_cases_count: casesWithoutIncrementalId.total,
        },
        last_update: {
          timestamp: initializedTime,
          unincremented_cases_count: casesWithoutIncrementalId.total,
          conflict_retry_count: 0,
        },
      };

      const taskInstance = await taskManager.ensureScheduled({
        id: CASES_INCREMENTAL_ID_SYNC_TASK_ID,
        taskType: CASES_INCREMENTAL_ID_SYNC_TASK_TYPE,
        schedule: {
          interval: CASES_INCREMENTAL_ID_SYNC_INTERVAL_DEFAULT,
        },
        params: {},
        state: initialTaskState,
        scope: ['cases'],
      });

      this.taskInstance = taskInstance;
      this.taskManager = taskManager;
      this.logger.info(
        `${CASES_INCREMENTAL_ID_SYNC_TASK_ID} scheduled with interval ${taskInstance.schedule?.interval}`
      );

      return taskInstance;
    } catch (e) {
      this.logger.error(
        `Error running task: ${CASES_INCREMENTAL_ID_SYNC_TASK_ID}: ${e}`,
        e?.message ?? e
      );
      return null;
    }
  }
}
