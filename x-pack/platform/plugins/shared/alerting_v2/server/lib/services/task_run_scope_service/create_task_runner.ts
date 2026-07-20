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
import { createToken } from '@kbn/core-di';

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
 * Waits for the injection service to become available (i.e. the plugin has
 * started), while remaining responsive to Task Manager cancellation.
 *
 * Task Manager aborts a run's `abortController` on timeout or shutdown. Racing
 * the abort signal ensures a run does not wait indefinitely if the plugin never
 * finishes starting: instead of leaving a pending promise dangling, the run
 * rejects and Task Manager handles it as a normal task failure.
 */
async function waitForInjection(
  injectionPromise: Promise<CoreDiServiceStart>,
  signal: AbortSignal,
  taskType: string,
  taskId: string
): Promise<CoreDiServiceStart> {
  const abortError = () =>
    new Error(
      `Aborted ${taskType} task while waiting for the alerting_v2 plugin to start (task id: ${taskId})`
    );

  if (signal.aborted) {
    throw abortError();
  }

  return new Promise<CoreDiServiceStart>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener('abort', onAbort, { once: true });

    injectionPromise
      .finally(() => signal.removeEventListener('abort', onAbort))
      .then(resolve, reject);
  });
}

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
export function createTaskRunnerFactory({
  injectionPromise,
}: {
  injectionPromise: Promise<CoreDiServiceStart>;
}): TaskRunnerFactory {
  return ({ taskRunnerClass, taskType, requiresFakeRequest = true }) => {
    return ({ taskInstance, abortController, fakeRequest }: RunContext) => ({
      run: async () => {
        if (requiresFakeRequest && !fakeRequest) {
          throw new Error(
            `Cannot execute ${taskType} task without Task Manager fakeRequest. Ensure the task is scheduled with an API key (task id: ${taskInstance.id})`
          );
        }

        const injection = await waitForInjection(
          injectionPromise,
          abortController.signal,
          taskType,
          taskInstance.id
        );
        const scope = injection.fork();

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
