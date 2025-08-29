/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

import { ReindexServiceServerPlugin } from './plugin';

export type { ReindexServiceServerPluginStart } from './types';
export { API_BASE_PATH_REINDEX_SERVICE } from './src/constants';

export const plugin = async (ctx: PluginInitializerContext) => {
  return new ReindexServiceServerPlugin(ctx);
};
