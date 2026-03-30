/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import type { CoreDiServiceStart } from '@kbn/core-di';
import { Global } from '@kbn/core-di-internal';
import { Request } from '@kbn/core-di-server';
import type {
  RunContext,
  RunResult,
  TaskRunCreatorFunction,
} from '@kbn/task-manager-plugin/server/task';
import type { ServiceIdentifier } from 'inversify';

type TaskRunnerConstructor<T> = new (...args: never[]) => T;

export interface AlertingTaskRunner {
  run(params: {
    taskInstance: RunContext['taskInstance'];
    abortController: RunContext['abortController'];
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
  paramsSchema: ObjectType;
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

export const TaskDefinition = Symbol.for(
  'alerting_v2.TaskDefinition'
) as ServiceIdentifier<AlertingTaskDefinition>;

export type TaskRunnerFactory = <TRunner extends AlertingTaskRunner>(params: {
  taskRunnerClass: TaskRunnerConstructor<TRunner>;
  taskType: string;
  requiresFakeRequest?: boolean;
}) => TaskRunCreatorFunction;

export const TaskRunnerFactoryToken = Symbol.for(
  'alerting_v2.TaskRunnerFactory'
) as ServiceIdentifier<TaskRunnerFactory>;

/**
 * Factory for task runners that creates scoped DI containers for each task execution.
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
export function createTaskRunnerFactory({
  getInjection,
}: {
  getInjection: () => CoreDiServiceStart;
}): TaskRunnerFactory {
  return ({ taskRunnerClass, taskType, requiresFakeRequest = true }) => {
    return ({ taskInstance, abortController, fakeRequest }: RunContext) => ({
      run: async () => {
        if (requiresFakeRequest && !fakeRequest) {
          throw new Error(
            `Cannot execute ${taskType} task without Task Manager fakeRequest. Ensure the task is scheduled with an API key (task id: ${taskInstance.id})`
          );
        }

        const scope = getInjection().fork();

        if (fakeRequest) {
          scope.bind(Request).toConstantValue(fakeRequest);
          scope.bind(Global).toConstantValue(Request);
          scope.bind(taskRunnerClass).toSelf().inRequestScope();
        } else {
          scope.bind(taskRunnerClass).toSelf().inTransientScope();
        }

        try {
          const runner = scope.get(taskRunnerClass);
          return await runner.run({ taskInstance, abortController });
        } finally {
          await scope.unbindAll();
        }
      },
    });
  };
}
