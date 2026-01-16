/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreDiServiceStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import { Global } from '@kbn/core-di-internal';
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

export type TaskRunnerFactory = <TRunner extends AlertingTaskRunner>(params: {
  taskRunnerClass: TaskRunnerConstructor<TRunner>;
  taskType: string;
}) => TaskRunCreatorFunction;

export const TaskRunnerFactoryToken = Symbol.for(
  'alerting_v2.TaskRunnerFactory'
) as ServiceIdentifier<TaskRunnerFactory>;

// Factory for task runners that depend on Task Manager fakeRequest.
// It forks the DI container and overrides Request scope with the fake request.
export function createTaskRunnerFactory({
  getInjection,
}: {
  getInjection: () => CoreDiServiceStart;
}): TaskRunnerFactory {
  return ({ taskRunnerClass, taskType }) => {
    return ({ taskInstance, abortController, fakeRequest }: RunContext) => ({
      run: async () => {
        if (!fakeRequest) {
          throw new Error(
            `Cannot execute ${taskType} task without Task Manager fakeRequest. Ensure the task is scheduled with an API key (task id: ${taskInstance.id})`
          );
        }

        const scope = getInjection().fork();
        scope.bind(Request).toConstantValue(fakeRequest);
        scope.bind(Global).toConstantValue(Request);
        scope.bind(taskRunnerClass).toSelf().inRequestScope();

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
