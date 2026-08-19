/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { ConfigSchema } from './config';

export const config: PluginConfigDescriptor = {
  schema: ConfigSchema,
};

export const plugin = async (ctx: PluginInitializerContext) => {
  const { SignificantEventsPlugin } = await import('./plugin');
  return new SignificantEventsPlugin(ctx);
};

export { SIGNIFICANT_EVENTS_DISCOVERY_AGENT_ID } from './agent_builder/agents/discovery/discovery';

export { SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID } from './agent_builder/tools/tool_ids';

export { createMemoryDiscoveryTools } from './lib/significant_events/memory_discovery_tools';
export { MemoryServiceImpl } from './memory_and_investigation/lib/memory';

export type { SignificantEventsRouteRepository } from './routes';
