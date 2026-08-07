/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializer } from '@kbn/core/server';
import type { PluginInitializerContext } from '@kbn/core/server';
import { configSchema, type AgentMemoryConfig } from './config';
import type {
  AgentMemoryPluginSetup,
  AgentMemoryPluginStart,
  AgentMemorySetupDependencies,
  AgentMemoryStartDependencies,
} from './types';

export const config: PluginConfigDescriptor<AgentMemoryConfig> = {
  schema: configSchema,
  exposeToBrowser: {},
};

export const plugin: PluginInitializer<
  AgentMemoryPluginSetup,
  AgentMemoryPluginStart,
  AgentMemorySetupDependencies,
  AgentMemoryStartDependencies
> = async (context: PluginInitializerContext<AgentMemoryConfig>) => {
  const { AgentMemoryPlugin } = await import('./plugin');
  return new AgentMemoryPlugin(context);
};

export type {
  AgentMemoryPluginSetup,
  AgentMemoryPluginStart,
  BackgroundActivityGate,
  BackgroundActivityGateResult,
} from './types';

export { MemoryServiceImpl, createMemoryDiscoveryTools } from './lib/memory';
export type { MemoryDiscoveryTools, MemoryService } from './lib/memory';
