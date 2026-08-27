/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import { createToken, type KibanaResolutionContext, Scope } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import type {
  RunContext,
  RunResult,
  TaskRunCreatorFunction,
} from '@kbn/task-manager-plugin/server/task';
import type { Newable } from 'inversify';
import type { PluginConfig } from '../../../config';

type TaskRunnerConstructor<T> = Newable<T>;

export interface AlertingTaskRunner {
  run(params: {
    taskInstance: RunContext['taskInstance'];
    signal: RunContext['signal'];
    executionUuid: RunContext['executionUuid'];
  }): Promise<RunResult>;
}

/**
 * Task definition interface for alerting tasks.
 * Similar to Route definitions, task definitions are bound to the TaskDefinition token
 * and automatically registered with Task Manager on setup.
 */
export interface AlertingTaskDefinition<TRunner extends AlertingTaskRunner = AlertingTaskRunner> {
  taskType: string;
  title: string;
  timeout: string;
  resolveTimeout?: (config: PluginConfig) => string;
  paramsSchema?: ObjectType;
  stateSchemaByVersion?: Record<
    number,
    {
      schema: ObjectType;
      up: (state: Record<string, unknown>) => Record<string, unknown>;
    }
  >;
  maxAttempts?: number;
  taskRunnerClass: TaskRunnerConstructor<TRunner>;
  /**
   * Whether this task requires a fakeRequest from Task Manager.
   * Tasks scheduled with API keys have a fakeRequest that enables request-scoped services.
   * Set to false for tasks that only use internal/singleton-scoped services.
   * @default true
   */
  requiresFakeRequest?: boolean;
}

export const TaskDefinition = createToken<AlertingTaskDefinition>('alerting_v2.TaskDefinition');

export type TaskRunnerFactory = <TRunner extends AlertingTaskRunner>(params: {
  taskRunnerClass: TaskRunnerConstructor<TRunner>;
  taskType: string;
  requiresFakeRequest?: boolean;
}) => TaskRunCreatorFunction;

export const TaskRunnerFactoryToken = createToken<TaskRunnerFactory>(
  'alerting_v2.TaskRunnerFactory'
);

/**
 * Factory for task runners that creates scoped DI containers for each task execution.
 *
 * Task Manager is a dependency of this plugin, so it can start polling and run a
 * task before this plugin's start lifecycle has bound `CoreStart('injection')`.
 * To avoid resolving the injection service too early, the factory waits on
 * `injectionPromise`, which resolves once the plugin's `OnStart` hook fires. This
 * guarantees a task run only forks the container after the plugin has started.
 * The wait is aborted if Task Manager cancels the run (see {@link waitForInjection}).
 *
 * For tasks with `requiresFakeRequest: true` (default):
 * - Forks the DI container and binds the fakeRequest to Request scope
 * - Enables request-scoped services (e.g., scoped ES clients)
 * - Throws if no fakeRequest is available (task must be scheduled with API key)
 *
 * For tasks with `requiresFakeRequest: false`:
 * - Forks the DI container for isolation
 * - Does not bind Request scope
 * - Task runner can only use internal/singleton-scoped services
 */
export function createTaskRunnerFactory({ inject }: KibanaResolutionContext): TaskRunnerFactory {
  return ({ taskRunnerClass, taskType, requiresFakeRequest = true }) => {
    return ({ taskInstance, signal, fakeRequest, executionUuid }: RunContext) => ({
      run: inject(Scope, async (scope) => {
        if (requiresFakeRequest && !fakeRequest) {
          throw new Error(
            `Cannot execute ${taskType} task without Task Manager fakeRequest. Ensure the task is scheduled with an API key (task id: ${taskInstance.id})`
          );
        }

        if (signal.aborted) {
          throw new Error(
            `Aborted ${taskType} task while waiting for the alerting_v2 plugin to start (task id: ${taskInstance.id})`
          );
        }

        if (fakeRequest) {
          scope.expose(Request).toConstantValue(fakeRequest);
          scope.bind(taskRunnerClass).toSelf().inRequestScope();
        } else {
          scope.bind(taskRunnerClass).toSelf().inTransientScope();
        }

        try {
          const runner = scope.get(taskRunnerClass);
          return await runner.run({ taskInstance, signal, executionUuid });
        } finally {
          scope.dispose();
        }
      }),
    });
  };
}
