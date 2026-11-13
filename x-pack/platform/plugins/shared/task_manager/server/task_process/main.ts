/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reviveElasticsearchConfig, elasticsearchConfigFromEnv } from './es_config';
import { createStandaloneHost } from './host';
import { startTaskProcessServer } from './server';
import type { TaskProcessInit, TaskProcessReady } from './wire';
import type { TaskTypeModule } from '../task_type_module';

declare const __KBN_VERSION__: string | undefined;

/** Kibana, when it forked this process, sends `init` first; a remote process uses its environment. */
const readInit = (): Promise<TaskProcessInit> => {
  if (process.send) {
    return new Promise<TaskProcessInit>((resolve) => {
      process.on('message', (message: TaskProcessInit) => {
        if (message?.kind === 'init') resolve(message);
      });
    });
  }
  return Promise.resolve({
    kind: 'init',
    elasticsearch: elasticsearchConfigFromEnv(),
    kibanaVersion: process.env.KIBANA_VERSION ?? __KBN_VERSION__ ?? 'unknown',
    authToken: process.env.TASK_PROCESS_TOKEN ?? '',
  });
};

/**
 * Entry of a task process: serves one task type for Task Manager, with the host the module asks
 * for. Kibana starts it as a child process; an operator can run it as a remote process.
 * Env of a remote process: ES_URL, ES_API_KEY or ES_USERNAME and ES_PASSWORD, PORT,
 * TASK_PROCESS_TOKEN.
 */
export const runTaskProcess = async (module: TaskTypeModule) => {
  try {
    const init = await readInit();
    const standalone = await createStandaloneHost({
      elasticsearch: reviveElasticsearchConfig(init.elasticsearch),
      kibanaVersion: init.kibanaVersion,
      savedObjectTypes: module.savedObjectTypes,
    });
    startTaskProcessServer({
      taskDefinitions: new Map([
        [
          module.type,
          { createTaskRunner: (context) => module.createTaskRunner(context, standalone.host) },
        ],
      ]),
      port: Number(process.env.PORT ?? 0),
      logger: standalone.host.logger,
      kibanaVersion: init.kibanaVersion,
      authToken: init.authToken || undefined,
      onListening: (port) => {
        if (process.send) {
          process.send({ kind: 'ready', port } satisfies TaskProcessReady);
        } else {
          process.stdout.write(`READY ${port}\n`);
        }
      },
      onShutdown: standalone.stop,
    });
  } catch (error) {
    process.stderr.write(`Task process failed to start: ${(error as Error).stack ?? error}\n`);
    process.exit(1);
  }
};
