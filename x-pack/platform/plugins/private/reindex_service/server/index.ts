/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

import { ReindexServiceServerPlugin } from './plugin';

export type { ReindexServiceServerPluginStart } from './types';
export { REINDEX_SERVICE_BASE_PATH } from '../common';

export { config } from './config';

export const plugin = async (ctx: PluginInitializerContext) => {
  return new ReindexServiceServerPlugin(ctx);
};
