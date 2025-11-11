/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { CatchupAgentPlugin } from './plugin';
import { configSchema, type CatchupAgentConfigType } from './config';

export type { CatchupAgentConfigType };

export const config: PluginConfigDescriptor<CatchupAgentConfigType> = {
  schema: configSchema,
};

export function plugin(initializerContext: PluginInitializerContext) {
  return new CatchupAgentPlugin(initializerContext);
}

export type { CatchupAgentPluginSetup, CatchupAgentPluginStart } from './types';
