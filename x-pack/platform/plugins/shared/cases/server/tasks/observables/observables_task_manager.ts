/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient, type CoreStart, type Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import { CASE_OBSERVABLE_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import { deleteObservablesOfCases } from '../../services/observables/delete_for_cases';
import {
  CASES_OBSERVABLES_DEDUPE_OVERLAP_MS,
  CASES_OBSERVABLES_DEDUPE_TASK_ID,
  CASES_OBSERVABLES_DEDUPE_TASK_TYPE,
  CASES_OBSERVABLES_DELETE_TASK_TYPE,
} from './constants';
import { removeRepeatedObservables } from './remove_repeats';

export interface CaseObservablesDeletionParams {
  caseIds: string[];
  namespace: string;
}

const isDeletionParams = (params: unknown): params is CaseObservablesDeletionParams => {
  const { caseIds, namespace } = (params ?? {}) as Partial<CaseObservablesDeletionParams>;
  return (
    Array.isArray(caseIds) &&
    caseIds.every((id) => typeof id === 'string') &&
    typeof namespace === 'string'
  );
};

interface DedupeTaskState {
  lastRunAt?: string;
}

/**
 * Registers and schedules the background tasks of `cases-observables`: deleting the observables
 * of deleted cases, and the daily removal of observables added twice at the same moment.
 */
export class ObservablesTaskManager {
  private readonly logger: Logger;
  private readonly usageCounter?: IUsageCounter;
  private internalSavedObjectsClient?: SavedObjectsClient;
  private taskManager?: TaskManagerStartContract;

  constructor(
    taskManager: TaskManagerSetupContract,
    logger: Logger,
    usageCollection?: UsageCollectionSetup
  ) {
    this.logger = logger.get('observables_tasks');
    this.usageCounter = usageCollection?.createUsageCounter('CasesObservables');

    taskManager.registerTaskDefinitions({
      [CASES_OBSERVABLES_DELETE_TASK_TYPE]: {
        title: 'Cases observables delete',
        description: 'Deletes the observables of deleted cases',
        timeout: '30m',
        maxAttempts: 3,
        createTaskRunner: ({ taskInstance }) => ({
          run: async () => {
            const savedObjectsClient = this.getInternalSavedObjectsClient();
            const { params } = taskInstance;

            if (!isDeletionParams(params)) {
              this.logger.error(
                `Skipping ${CASES_OBSERVABLES_DELETE_TASK_TYPE} task ${taskInstance.id}: invalid params`
              );
              return;
            }

            try {
              const deleted = await deleteObservablesOfCases({
                savedObjectsClient,
                caseIds: params.caseIds,
                namespace: params.namespace,
                isInternalClient: true,
                logger: this.logger,
              });
              this.logger.info(
                `Deleted ${deleted} observables of ${params.caseIds.length} deleted case(s)`
              );
              this.usageCounter?.incrementCounter({ counterName: 'observablesDeleteTaskSuccess' });
            } catch (error) {
              this.logger.error(
                `Failed to delete the observables of cases [${params.caseIds.join(', ')}]: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
              this.usageCounter?.incrementCounter({ counterName: 'observablesDeleteTaskError' });
              throw error;
            }
          },
        }),
      },
      [CASES_OBSERVABLES_DEDUPE_TASK_TYPE]: {
        title: 'Cases observables repeat cleanup',
        description:
          'Removes observables added to a case twice at the same moment and recounts case totals',
        timeout: '30m',
        createTaskRunner: ({ taskInstance }) => ({
          run: async () => {
            const savedObjectsClient = this.getInternalSavedObjectsClient();
            const startedAt = new Date().toISOString();
            const { lastRunAt } = (taskInstance.state ?? {}) as DedupeTaskState;
            const since =
              lastRunAt != null
                ? new Date(
                    Date.parse(lastRunAt) - CASES_OBSERVABLES_DEDUPE_OVERLAP_MS
                  ).toISOString()
                : undefined;

            try {
              const { casesChecked, removed, totalsSet } = await removeRepeatedObservables({
                savedObjectsClient,
                logger: this.logger,
                since,
              });
              this.logger.info(
                `Checked ${casesChecked} case(s) for repeated observables: removed ${removed}, set ${totalsSet} case total(s)`
              );
              this.usageCounter?.incrementCounter({ counterName: 'observablesDedupeTaskSuccess' });
              return { state: { lastRunAt: startedAt } };
            } catch (error) {
              this.logger.error(
                `Failed to remove repeated observables: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
              this.usageCounter?.incrementCounter({ counterName: 'observablesDedupeTaskError' });
              throw error;
            }
          },
        }),
      },
    });
  }

  private getInternalSavedObjectsClient(): SavedObjectsClient {
    if (!this.internalSavedObjectsClient) {
      throw new Error('Missing internal saved objects client.');
    }
    return this.internalSavedObjectsClient;
  }

  public start(taskManager: TaskManagerStartContract, core: CoreStart): void {
    this.taskManager = taskManager;
    this.internalSavedObjectsClient = new SavedObjectsClient(
      core.savedObjects.createInternalRepository([CASE_OBSERVABLE_SAVED_OBJECT, CASE_SAVED_OBJECT])
    );

    taskManager
      .ensureScheduled({
        id: CASES_OBSERVABLES_DEDUPE_TASK_ID,
        taskType: CASES_OBSERVABLES_DEDUPE_TASK_TYPE,
        schedule: { interval: '1d' },
        params: {},
        state: {},
        scope: ['cases'],
      })
      .catch((error: unknown) =>
        this.logger.error(
          `Error scheduling task ${CASES_OBSERVABLES_DEDUPE_TASK_ID}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
  }

  /** Schedules the deletion of the observables of deleted cases. */
  public async scheduleCaseObservablesDeletion(
    params: CaseObservablesDeletionParams
  ): Promise<void> {
    if (!this.taskManager) {
      throw new Error('The observables task manager has not started');
    }

    await this.taskManager.schedule({
      taskType: CASES_OBSERVABLES_DELETE_TASK_TYPE,
      params,
      state: {},
      scope: ['cases'],
    });
  }
}
