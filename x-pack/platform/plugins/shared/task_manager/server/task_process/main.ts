/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { startTaskProcessServer } from './server';
import { startTaskProcessCore } from './core_process';
import { getTaskProcessContext } from './context';
import { TASK_PROCESS_PROTOCOL_VERSION, TASK_PROCESS_CAPABILITIES } from './protocol';
import type { TaskProcessInit, TaskProcessReady } from './wire';
import { createTaskProcessParentWatcher } from './parent_watch';
import { readTaskProcessInit } from './main_init';
import type { TaskProcessInstrumentation } from './instrumentation';
export { initFromEnv } from './main_init';
import type { TaskTypeModule } from '../task_type_module';

/**
 * Entry of a task process: Core and the plugins a task type needs, started the way Kibana starts
 * them, serving one task type for Task Manager. Kibana starts it as a child process; an operator can
 * run it as a remote process. Env of a remote process: ES_URL, ES_API_KEY or ES_USERNAME and
 * ES_PASSWORD, PORT, TASK_PROCESS_TOKEN.
 */
export const runTaskProcess = async (
  module: TaskTypeModule,
  {
    contributions,
    init: providedInit,
    instrumentation,
    registerStop,
  }: {
    contributions?: Record<string, unknown[]>;
    init?: TaskProcessInit;
    instrumentation?: TaskProcessInstrumentation;
    registerStop?: ReturnType<typeof createTaskProcessParentWatcher>;
  } = {}
): Promise<void> => {
  const onCoreStarted = registerStop ?? createTaskProcessParentWatcher();
  try {
    const init = providedInit ?? (await readTaskProcessInit());
    const core = await startTaskProcessCore({ init, module, contributions });
    const stop = async (): Promise<void> => {
      try {
        await core.stop();
      } finally {
        await instrumentation?.shutdown();
      }
    };
    onCoreStarted(stop);
    if (instrumentation) {
      const { onRunEnd } = core.host;
      if (!onRunEnd)
        throw new Error('Native instrumentation requires the worker run-end lifecycle');
      onRunEnd(instrumentation.forceFlush);
    }

    startTaskProcessServer({
      taskDefinitions: core.definitions,
      executionContext: core.host.executionContext,
      enrichFakeRequest: core.enrichFakeRequest,
      getFeatureFlagDefinitions: () => getTaskProcessContext().module.featureFlags ?? {},
      port: Number(process.env.PORT ?? 0),
      // Only a forked process is Kibana's own; its runs carry credentials, so it is loopback only.
      host: process.send ? '127.0.0.1' : process.env.HOST || undefined,
      logger: core.logger,
      kibanaVersion: init.kibanaVersion,
      authToken: init.authToken || undefined,
      onListening: (port) => {
        if (process.send) {
          process.send({
            kind: 'ready',
            port,
            protocolVersion: TASK_PROCESS_PROTOCOL_VERSION,
            capabilities: TASK_PROCESS_CAPABILITIES,
            featureFlags: getTaskProcessContext().module.featureFlags ?? {},
          } satisfies TaskProcessReady);
        } else {
          process.stdout.write(`READY ${port}\n`);
        }
      },
      onShutdown: stop,
      flush: core.flush,
      collectMetrics: instrumentation?.collectMetrics,
      collectGauges: instrumentation?.collectGauges,
    });
  } catch (error) {
    await instrumentation?.shutdown().catch((shutdownError: Error) => {
      process.stderr.write(
        `Task process instrumentation shutdown failed: ${shutdownError.message}\n`
      );
    });
    process.stderr.write(`Task process failed to start: ${(error as Error).stack ?? error}\n`);
    process.exit(1);
  }
};
