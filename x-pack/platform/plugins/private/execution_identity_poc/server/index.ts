/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

// Kibana Platform `plugin()` initializer. Keep `./plugin` behind a dynamic import
// so it is only parsed/executed when the plugin actually runs.
export async function plugin(initializerContext: PluginInitializerContext) {
  const { ExecutionIdentityPocPlugin } = await import('./plugin');
  return new ExecutionIdentityPocPlugin(initializerContext);
}
