/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { mappings } from './mappings';

interface DurableFunctionsResultState {
  result: unknown;
  status: string;
}

interface DurableFunctionsState {
  taskPool: string[];
  workerState: Record<string, DurableFunctionsResultState>;
  workerQueue: string[];
  maxWorkers: number;
  status: string;
  result: unknown;
}

type WorkerExecutor = () => unknown;
type OrchestratorExecutor = (context: OrchestratorContext) => unknown;

interface OrchestratorContext {
  doWork: (context: WorkerContext) => Promise<DurableFunctionsResultState>;
  doWorkAsync: (context: WorkerContext) => Promise<DurableFunctionsResultState>;
}
interface WorkerContext {
  id: string;
  executor: WorkerExecutor;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DurableFunctionsSetupContract {}

export interface DurableFunctionsStartContract {
  orchestrate: (id: string, executor: OrchestratorExecutor) => Promise<string>;
  doWork: (
    orchestratorId: string
  ) => (context: WorkerContext) => Promise<DurableFunctionsResultState>;
  doWorkAsync: (
    orchestratorId: string
  ) => (context: WorkerContext) => Promise<DurableFunctionsResultState>;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ConfigSchema {}

export interface DurableFunctionsSetup {
  taskManager: TaskManagerSetupContract;
}

export interface DurableFunctionsStart {
  taskManager: TaskManagerStartContract;
}

const SO_NAME = 'durable-functions-state';
const ORCHESTRATOR_TASK_TYPE = 'durable-functions-orchestrator';
const SYNC_WORKER_TASK_TYPE = 'durable-functions-sync-worker';
const ASYNC_WORKER_TASK_TYPE = 'durable-functions-async-worker';

export class DurableFunctionsAppPlugin
  implements
    Plugin<
      DurableFunctionsSetupContract,
      DurableFunctionsStartContract,
      DurableFunctionsSetup,
      DurableFunctionsStart
    >
{
  private workerExecutors: Record<string, WorkerExecutor>;
  private orchestratorExecutors: Record<string, OrchestratorExecutor>;
  private orchestratorState: Record<string, DurableFunctionsState>;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.workerExecutors = {};
    this.orchestratorExecutors = {};
    this.orchestratorState = {};
  }

  setup(
    core: CoreSetup<DurableFunctionsStart, DurableFunctionsStartContract>,
    plugins: DurableFunctionsSetup
  ): DurableFunctionsSetupContract {
    core.savedObjects.registerType({
      name: SO_NAME,
      namespaceType: 'agnostic',
      hidden: true,
      mappings,
    });

    plugins.taskManager.registerTaskDefinitions({
      [ORCHESTRATOR_TASK_TYPE]: {
        title: 'Durable Functions Orchestrator Task',
        createTaskRunner: (context) => {
          return {
            run: async () => {
              const startServices = await core.getStartServices();
              const orchestratorId = context.taskInstance.id;
              const plugins = startServices[1];
              const orchestrator = startServices[2];

              const executor = this.orchestratorExecutors[orchestratorId];
              const result = await executor({
                doWork: orchestrator.doWork(orchestratorId),
                doWorkAsync: orchestrator.doWorkAsync(orchestratorId),
              });

              const orchestratorState = this.orchestratorState[orchestratorId];

              console.log('Running orchestrator', orchestratorState);

              let isSuccessful = true;
              Object.values(orchestratorState.workerState).forEach((state) => {
                if (state.status !== 'success') {
                  isSuccessful = false;
                }
              });

              if (isSuccessful) {
                console.log('Cleanup!');
                this.orchestratorState[orchestratorId] = {
                  ...this.orchestratorState[orchestratorId],
                  status: 'success',
                  result,
                };
                console.log(
                  'Final state!',
                  JSON.stringify(this.orchestratorState[orchestratorId], null, 2)
                );
                await plugins.taskManager.removeIfExists(orchestratorId);
                delete this.orchestratorExecutors[orchestratorId];
              }
            },

            cancel: async () => {},
          };
        },
      },
    });

    plugins.taskManager.registerTaskDefinitions({
      [SYNC_WORKER_TASK_TYPE]: {
        title: 'Durable Functions Sync Worker Task',
        createTaskRunner: (context) => {
          return {
            run: async () => {
              const startServices = await core.getStartServices();
              const workerId = context.taskInstance.id;
              const orchestratorId = context.taskInstance.params.orchestratorId;
              const plugins = startServices[1];

              console.log('worker running!', workerId);
              const executor = this.workerExecutors[workerId];
              const result = await executor();

              this.orchestratorState[orchestratorId].workerState[workerId] = {
                ...this.orchestratorState[orchestratorId].workerState[workerId],
                status: 'success',
                result,
              };

              await plugins.taskManager.removeIfExists(workerId);
            },

            cancel: async () => {},
          };
        },
      },
    });

    plugins.taskManager.registerTaskDefinitions({
      [ASYNC_WORKER_TASK_TYPE]: {
        title: 'Durable Functions Async Worker Task',
        createTaskRunner: (context) => {
          return {
            run: async () => {
              const startServices = await core.getStartServices();
              const workerId = context.taskInstance.id;
              const orchestratorId = context.taskInstance.params.orchestratorId;
              const plugins = startServices[1];

              const workerQueue = this.orchestratorState[orchestratorId].workerQueue;

              if (workerQueue[0] !== workerId) {
                return;
              }

              this.orchestratorState[orchestratorId].workerState[workerId] = {
                ...this.orchestratorState[orchestratorId].workerState[workerId],
                status: 'running',
              };

              const executor = this.workerExecutors[workerId];
              const result = await executor();

              this.orchestratorState[orchestratorId].workerState[workerId] = {
                ...this.orchestratorState[orchestratorId].workerState[workerId],
                result,
                status: 'success',
              };

              this.orchestratorState[orchestratorId].workerQueue = this.orchestratorState[
                orchestratorId
              ].workerQueue.filter((value) => value !== workerId);

              await plugins.taskManager.removeIfExists(workerId);
            },
            cancel: async () => {},
          };
        },
      },
    });
    return {};
  }

  start(core: CoreStart, plugins: DurableFunctionsStart): DurableFunctionsStartContract {
    const scheduleWorkTask = async (
      orchestratorId: string,
      workerId: string,
      executor: WorkerExecutor,
      isAsync: boolean = false
    ) => {
      const orchestratorState = this.orchestratorState[orchestratorId];
      const currentWorkerState = orchestratorState.workerState[workerId];

      if (currentWorkerState) {
        return currentWorkerState;
      }

      const initialState = {
        result: null,
        status: isAsync ? 'idle' : 'running',
      };

      this.workerExecutors[workerId] = executor;
      this.orchestratorState[orchestratorId].workerState = {
        ...this.orchestratorState[orchestratorId].workerState,
        [workerId]: initialState,
      };

      if (isAsync) {
        this.orchestratorState[orchestratorId].workerQueue.push(workerId);
      }

      await plugins.taskManager.ensureScheduled({
        taskType: isAsync ? ASYNC_WORKER_TASK_TYPE : SYNC_WORKER_TASK_TYPE,
        id: workerId,
        params: {
          orchestratorId,
        },
        state: {},
        schedule: {
          interval: '10s',
        },
      });

      return initialState;
    };

    return {
      doWork:
        (orchestratorId: string) =>
        async (context): Promise<DurableFunctionsResultState> => {
          console.log('Scheduling task', context.id);
          return scheduleWorkTask(orchestratorId, context.id, context.executor, false);
        },
      doWorkAsync: (orchestratorId: string) => async (context) => {
        console.log('Scheduling async task', context.id);
        return scheduleWorkTask(orchestratorId, context.id, context.executor, true);
      },
      orchestrate: async (id, executor) => {
        if (this.orchestratorExecutors[id]) {
          await plugins.taskManager.removeIfExists(id);
          delete this.orchestratorState[id];
        }

        console.log('Orchestrating!');
        this.orchestratorExecutors[id] = executor;
        this.orchestratorState[id] = {
          taskPool: [],
          workerState: {},
          workerQueue: [],
          maxWorkers: 3,
          status: 'running',
          result: null,
        };

        await plugins.taskManager.ensureScheduled({
          taskType: ORCHESTRATOR_TASK_TYPE,
          id,
          params: { id },
          state: {},
          schedule: {
            interval: '3s',
          },
        });

        return id;
      },
    };
  }
}
