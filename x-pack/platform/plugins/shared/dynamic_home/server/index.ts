/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { DynamicHomePluginSetup, DynamicHomePluginStart } from './plugin';
export type { DynamicHomePluginSetup, DynamicHomePluginStart };

export const plugin: PluginInitializer<DynamicHomePluginSetup, DynamicHomePluginStart> = async (
  _ctx: PluginInitializerContext
) => {
  const { DynamicHomePlugin } = await import('./plugin');
  return new DynamicHomePlugin();
};
