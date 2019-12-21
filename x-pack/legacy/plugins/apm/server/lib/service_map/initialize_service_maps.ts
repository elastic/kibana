/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { CoreSetup, Logger } from 'src/core/server';
import { Observable } from 'rxjs';
import { PluginSetupContract as TaskManagerPluginContract } from '../../../../task_manager/plugin';
import { RunContext, ConcreteTaskInstance } from '../../../../task_manager';
import { RunFunction } from '../../../../task_manager/task';
import { APMConfig } from '../../../../../../plugins/apm/server';
import { runServiceMapTask } from './run_service_map_task';
import {
  SERVICE_MAP_TASK_TYPE,
  SERVICE_MAP_TASK_ID
} from '../../../common/service_map_constants';
import { createServiceConnectionsIndex } from './create_service_connections_index';
import { setupRequest, Setup } from '../helpers/setup_request';

function isLessThan1Hour(unixTimestamp = 0) {
  const hourMilliseconds = 60 * 60 * 1000;
  return Date.now() - unixTimestamp < hourMilliseconds;
}

let scopedRunFunction:
  | ((taskInstance: ConcreteTaskInstance) => ReturnType<RunFunction>)
  | undefined;

function isTaskActive() {
  return scopedRunFunction !== undefined;
}

async function runTask(setup: Setup, state: Record<string, any> = {}) {
  const nextState: typeof state = {
    ...state,
    isActive: true
  };
  try {
    const { latestTransactionTime } = await runServiceMapTask(
      setup,
      isLessThan1Hour(state.latestTransactionTime)
        ? state.latestTransactionTime
        : 'now-1h'
    );
    nextState.latestTransactionTime = latestTransactionTime;
  } catch (error) {
    scopedRunFunction = undefined;
    return { state: nextState, error };
  }
  return { state: nextState };
}

async function scheduleTask(
  taskManager: TaskManagerPluginContract,
  runFn: NonNullable<typeof scopedRunFunction>,
  initialState: Record<string, any> = {}
) {
  scopedRunFunction = runFn;
  return await taskManager.ensureScheduled({
    id: SERVICE_MAP_TASK_ID,
    taskType: SERVICE_MAP_TASK_TYPE,
    schedule: { interval: '1m' },
    scope: ['apm'],
    params: {},
    state: initialState
  });
}

export async function initializeServiceMaps(
  core: CoreSetup,
  {
    config$,
    logger,
    __LEGACY
  }: {
    config$: Observable<APMConfig>;
    logger: Logger;
    __LEGACY: { server: Server };
  }
) {
  config$.subscribe(config => {
    const server = __LEGACY.server;
    const router = core.http.createRouter();

    if (!config['xpack.apm.serviceMapEnabled']) {
      return;
    }

    const taskManager = server.plugins.task_manager;
    if (taskManager) {
      taskManager.registerTaskDefinitions({
        [SERVICE_MAP_TASK_TYPE]: {
          title: 'ApmServiceMapTask',
          type: SERVICE_MAP_TASK_TYPE,
          description: 'Extract connections in traces for APM service maps',
          timeout: '2m',
          maxAttempts: 1,
          createTaskRunner({ taskInstance }: RunContext) {
            return {
              run: async () => {
                if (!scopedRunFunction) {
                  return;
                }
                return await scopedRunFunction(taskInstance);
              }
            };
          }
        }
      });

      router.get(
        {
          path: '/api/apm/service-map-start-task',
          validate: false
        },
        async (context, request, response) => {
          if (isTaskActive()) {
            return response.ok({ body: { taskStatus: 'active' } });
          }
          try {
            const setup = await setupRequest(
              {
                ...context,
                __LEGACY,
                params: { query: { _debug: false } },
                config,
                logger
              },
              request
            );
            await createServiceConnectionsIndex(setup);
            const { state: initialState } = await runTask(setup); // initial task run
            await scheduleTask(
              taskManager,
              (taskInstance: ConcreteTaskInstance) =>
                runTask(setup, taskInstance.state), // maintain scope in subsequent task runs
              initialState
            );
            return response.ok({ body: { taskStatus: 'initialized' } });
          } catch (error) {
            logger.error(error);
            if (error.statusCode === 403) {
              return response.forbidden({ body: error });
            }
            return response.internalError({ body: error });
          }
        }
      );
    }
  });
}
