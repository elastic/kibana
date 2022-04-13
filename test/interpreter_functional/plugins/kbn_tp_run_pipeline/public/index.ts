/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializer, PluginInitializerContext } from 'src/core/public';
import { Plugin, StartDeps } from './plugin';
export type { StartDeps };

export const plugin: PluginInitializer<void, void, {}, StartDeps> = (
  initializerContext: PluginInitializerContext
) => {
  return new Plugin(initializerContext);
};
