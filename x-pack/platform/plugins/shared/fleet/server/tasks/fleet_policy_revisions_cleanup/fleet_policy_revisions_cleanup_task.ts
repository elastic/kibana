/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type Logger } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LoggerFactory } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';

import { appContextService } from '../../services';

import { cleanupPolicyRevisions } from './cleanup_policy_revisions';

export const TYPE = 'fleet:policy-revisions-cleanup-task';
export const VERSION = '1.0.0';
const TITLE = 'Fleet Policy Revisions Cleanup Task';
const SCOPE = ['fleet'];
const TASK_TIMEOUT = '5m';

interface FleetPolicyRevisionsCleanupTaskConfig {
  maxRevisions?: number;
  interval?: string;
  maxPoliciesPerRun?: number;
}

interface FleetPolicyRevisionsCleanupTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
  config: FleetPolicyRevisionsCleanupTaskConfig;
}

interface FleetPolicyRevisionsCleanupTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class FleetPolicyRevisionsCleanupTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private taskInterval: string;
  private maxRevisions: number;
  private maxPoliciesPerRun: number;

  constructor(setupContract: FleetPolicyRevisionsCleanupTaskSetupContract) {
    const { core, taskManager, logFactory, config } = setupContract;
    this.logger = logFactory.get(this.taskId);

    this.taskInterval = config.interval ?? '1h';
    this.maxRevisions = config.maxRevisions ?? 10;
    this.maxPoliciesPerRun = config.maxPoliciesPerRun ?? 100;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout: TASK_TIMEOUT,
        createTaskRunner: ({
          taskInstance,
          abortController,
        }: {
          taskInstance: ConcreteTaskInstance;
          abortController: AbortController;
        }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core, abortController);
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: FleetPolicyRevisionsCleanupTaskStartContract) => {
    if (!taskManager) {
      this.logger.error('[FleetPolicyRevisionsCleanupTask] Missing required service during start');
      return;
    }

    this.wasStarted = true;
    this.logger.info(
      `[FleetPolicyRevisionsCleanupTask] Started with interval of [${this.taskInterval}], max_revisions: ${this.maxRevisions}, max_policies_per_run: ${this.maxPoliciesPerRun}`
    );

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TYPE,
        scope: SCOPE,
        schedule: {
          interval: this.taskInterval,
        },
        state: {},
        params: { version: VERSION },
      });
    } catch (e) {
      this.logger.error(
        `Error scheduling task FleetPolicyRevisionsCleanupTask, error: ${e.message}`,
        e
      );
    }
  };

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  private endRun(msg: string = '') {
    this.logger.debug(`[FleetPolicyRevisionsCleanupTask] runTask ended${msg ? ': ' + msg : ''}`);
  }

  public runTask = async (
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup,
    abortController: AbortController
  ) => {
    // Check if the feature flag is enabled
    if (!appContextService.getExperimentalFeatures().enableFleetPolicyRevisionsCleanupTask) {
      this.logger.debug(
        '[FleetPolicyRevisionsCleanupTask] Aborting runTask: fleet policy revision cleanup task feature is disabled'
      );
      return;
    }

    if (!this.wasStarted) {
      this.logger.debug('[FleetPolicyRevisionsCleanupTask] runTask Aborted. Task not started yet');
      return;
    }

    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `[FleetPolicyRevisionsCleanupTask] Outdated task version: Got [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.debug(`[FleetPolicyRevisionsCleanupTask] runTask() started`);

    const [coreStart, _startDeps] = (await core.getStartServices()) as any;
    const esClient = coreStart.elasticsearch.client.asInternalUser;

    try {
      await cleanupPolicyRevisions(esClient, {
        abortController,
        logger: this.logger,
        config: {
          maxRevisions: this.maxRevisions,
          maxPolicies: this.maxPoliciesPerRun,
          timeout: TASK_TIMEOUT,
        },
      });

      this.endRun('success');
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(
          `[FleetPolicyRevisionsCleanupTask] request aborted due to timeout: ${err}`
        );
        this.endRun();
        return;
      }
      this.logger.error(`[FleetPolicyRevisionsCleanupTask] error: ${err}`);
      this.endRun('error');
    }
  };
}
