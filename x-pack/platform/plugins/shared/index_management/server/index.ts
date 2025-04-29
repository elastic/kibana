/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '@kbn/core/server';

export { config } from './config';

export const plugin = async (context: PluginInitializerContext) => {
  const { IndexMgmtServerPlugin } = await import('./plugin');
  return new IndexMgmtServerPlugin(context);
};

/** @public */
export type { Dependencies } from './types';
export type { IndexManagementPluginSetup } from './plugin';
export type { Index, LegacyTemplateSerialized } from '../common';
export type { IndexManagementConfig } from './config';
