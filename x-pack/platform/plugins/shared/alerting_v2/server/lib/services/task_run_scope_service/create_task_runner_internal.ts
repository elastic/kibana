/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreDiServiceStart } from '@kbn/core-di';
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

export type TaskRunnerInternalFactory = <TRunner extends AlertingTaskRunner>(params: {
  taskRunnerClass: TaskRunnerConstructor<TRunner>;
}) => TaskRunCreatorFunction;

export const TaskRunnerInternalFactoryToken = Symbol.for(
  'alerting_v2.TaskRunnerInternalFactory'
) as ServiceIdentifier<TaskRunnerInternalFactory>;

export function createTaskRunnerInternalFactory({
  getInjection,
}: {
  getInjection: () => CoreDiServiceStart;
}): TaskRunnerInternalFactory {
  return ({ taskRunnerClass }) => {
    return ({ taskInstance, abortController }: RunContext) => ({
      run: async () => {
        const scope = getInjection().fork();
        scope.bind(taskRunnerClass).toSelf().inSingletonScope();

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
