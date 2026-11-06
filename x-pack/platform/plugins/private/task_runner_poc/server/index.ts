/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import type { TaskRunnerPocConfig } from './config';

export { config } from './config';

export async function plugin(initializerContext: PluginInitializerContext<TaskRunnerPocConfig>) {
  const { TaskRunnerPocPlugin } = await import('./plugin');
  return new TaskRunnerPocPlugin(initializerContext);
}
