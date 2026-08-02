/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

/**
 * Plugin initializer.
 *
 * The implementation in `./plugin` is loaded lazily with a dynamic `import`
 * (rather than a static top-level import) so Node does not parse/execute
 * `plugin.ts` when this plugin is disabled. This is required by the
 * `@kbn/eslint/no_sync_import_from_plugin` rule for plugin `server/index.ts`
 * entries.
 */
export const plugin = async (initializerContext: PluginInitializerContext) => {
  const { MockLlmPlugin } = await import('./plugin');
  return new MockLlmPlugin(initializerContext);
};
