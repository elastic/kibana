/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { PluginConfig } from '../config';
import { configSchema } from '../config';

/**
 * The task runtime of alerting v2: the rule executor, dispatcher, API key invalidation, telemetry and
 * alert actions cleanup tasks with everything they need and nothing that serves requests. Kibana's
 * `server` entry binds the runtime through this file (`bindTaskRuntime`), and a task pod loads it on
 * its own as `module`, so a task runs the same code in both places.
 */
export { taskRuntimeModule as module, bindTaskRuntime } from '../setup/bind_task_runtime';

export const config: PluginConfigDescriptor<PluginConfig> = { schema: configSchema };
