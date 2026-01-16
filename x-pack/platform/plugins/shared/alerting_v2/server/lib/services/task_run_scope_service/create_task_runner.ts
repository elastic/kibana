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
import { injectable } from 'inversify';

type TaskRunnerConstructor<T> = new (...args: never[]) => T;

export interface AlertingTaskRunner {
  run(params: {
    taskInstance: RunContext['taskInstance'];
    abortController: RunContext['abortController'];
  }): Promise<RunResult>;
}

// Factory for task runners that depend on Task Manager fakeRequest.
// It forks the DI container and overrides Request scope with the fake request.
@injectable()
export class TaskRunnerFactory {
  private di?: CoreDiServiceStart;

  public initialize(di: CoreDiServiceStart) {
    this.di = di;
  }

  public create<TRunner extends AlertingTaskRunner>({
    taskRunnerClass,
    taskType,
  }: {
    taskRunnerClass: TaskRunnerConstructor<TRunner>;
    taskType: string;
  }): TaskRunCreatorFunction {
    return ({ taskInstance, abortController, fakeRequest }: RunContext) => ({
      run: async () => {
        if (!this.di) {
          throw new Error('TaskRunnerFactory is not initialized. Was OnStart executed?');
        }

        if (!fakeRequest) {
          throw new Error(
            `Cannot execute ${taskType} task without Task Manager fakeRequest. Ensure the task is scheduled with an API key (task id: ${taskInstance.id})`
          );
        }

        const scope = this.di.fork();
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
  }
}
