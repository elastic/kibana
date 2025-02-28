/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObjectType } from '@kbn/config-schema';
import { IClusterClient, Logger, ISavedObjectsRepository } from '@kbn/core/server';
import { TaskRegisterDefinition } from '../task_type_dictionary';
import {
  ConcreteTaskInstance,
  TaskPriority,
  TaskCost,
  ScheduleType,
  RecurringTaskRunResult,
} from '../task';
import { createWrappedClusterClientFactory } from './wrap_scoped_cluster_client';

export interface BaseTaskTypeFnOpts {
  abortController: AbortController;
  params: ConcreteTaskInstance['params'];
  clusterClient: IClusterClient;
  getSavedObjectsRepository: (includedHiddenTypes?: string[]) => Promise<ISavedObjectsRepository>;
}

export type OneOffTaskTypeFnOpts = BaseTaskTypeFnOpts;
export interface RecurringTaskTypeFnOpts extends BaseTaskTypeFnOpts {
  state: ConcreteTaskInstance['state'];
}

export interface BaseTaskTypeOpts {
  /**
   * How long, in minutes or seconds, the system should wait for the task to complete
   * before it is considered to be timed out. (e.g. '5m', the default). If
   * the task takes longer than this, Kibana will send it a kill command and
   * the task will be re-attempted.
   */
  timeout?: string;
  /**
   * An optional definition of task priority. Tasks will be sorted by priority prior to claiming
   * so high priority tasks will always be claimed before normal priority, which will always be
   * claimed before low priority
   */
  priority?: TaskPriority;
  /**
   * An optional definition of the cost associated with running the task.
   */
  cost?: TaskCost;
  /**
   * The maximum number tasks of this type that can be run concurrently per Kibana instance.
   * Setting this value will force Task Manager to poll for this task type separately from other task types
   * which can add significant load to the ES cluster, so please use this configuration only when absolutely necessary.
   * The default value, if not given, is 0.
   */
  maxConcurrency?: number;

  paramsSchema?: ObjectType;
}

export interface RecurringTaskTypeOpts extends BaseTaskTypeOpts {
  stateSchemaByVersion?: Record<
    number,
    {
      schema: ObjectType;
      up: (state: Record<string, unknown>) => Record<string, unknown>;
    }
  >;
}

export interface OneOffTaskTypeOpts extends BaseTaskTypeOpts {
  /**
   * Up to how many times the task should retry when it fails to run. This will
   * default to the global variable. The default value, if not specified, is 1.
   */
  maxAttempts?: number;
}

export interface TaskTypeFactoryOpts {
  getClusterClient: () => Promise<IClusterClient>;
  logger: Logger;
  getSavedObjectsRepository: (includedHiddenTypes?: string[]) => Promise<ISavedObjectsRepository>;
}

export class TaskTypeFactory {
  private logger: Logger;
  private getClusterClient: () => Promise<IClusterClient>;
  private getSavedObjectsRepository: (
    includedHiddenTypes?: string[]
  ) => Promise<ISavedObjectsRepository>;

  constructor(opts: TaskTypeFactoryOpts) {
    this.getClusterClient = opts.getClusterClient;
    this.logger = opts.logger;
    this.getSavedObjectsRepository = opts.getSavedObjectsRepository;
  }

  public createOneOffTaskType(
    fn: (options: OneOffTaskTypeFnOpts) => Promise<void>,
    options?: OneOffTaskTypeOpts
  ): TaskRegisterDefinition {
    return {
      ...options,
      scheduleType: ScheduleType.OneOff,
      createTaskRunner: ({ taskInstance }) => {
        const abortController = new AbortController();
        return {
          run: async () => {
            const clusterClient = await this.getClusterClient();
            const wrappedClusterClient = createWrappedClusterClientFactory({
              clusterClient,
              task: taskInstance,
              abortController,
              logger: this.logger,
            }).client();
            await fn({
              abortController,
              params: taskInstance.params,
              clusterClient: wrappedClusterClient,
              getSavedObjectsRepository: this.getSavedObjectsRepository,
            });
            return { state: {} };
          },
          cancel: async () => {
            abortController.abort();
          },
        };
      },
    };
  }

  public createRecurringTaskType(
    fn: (options: RecurringTaskTypeFnOpts) => Promise<RecurringTaskRunResult>,
    options?: RecurringTaskTypeOpts
  ): TaskRegisterDefinition {
    return {
      ...options,
      scheduleType: ScheduleType.Recurring,
      createTaskRunner: ({ taskInstance }) => {
        const abortController = new AbortController();
        return {
          run: async () => {
            const clusterClient = await this.getClusterClient();
            const wrappedClusterClient = createWrappedClusterClientFactory({
              clusterClient,
              task: taskInstance,
              abortController,
              logger: this.logger,
            }).client();
            const result = await fn({
              abortController,
              params: taskInstance.params,
              state: taskInstance.state,
              clusterClient: wrappedClusterClient,
              getSavedObjectsRepository: this.getSavedObjectsRepository,
            });
            return { ...result, state: result.state || {} };
          },
          cancel: async () => {
            abortController.abort();
          },
        };
      },
    };
  }
}
