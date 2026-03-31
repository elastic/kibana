/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { AgentBuilderConfig } from './config';
import type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
  AgentBuilderSetupDependencies,
  AgentBuilderStartDependencies,
} from './types';
import { AgentBuilderPlugin } from './plugin';

export type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
  ToolsSetup,
  ToolsStart,
  SmlStart,
} from './types';

export type {
  SmlTypeDefinition,
  SmlChunk,
  SmlData,
  SmlContext,
  SmlToAttachmentContext,
  SmlListItem,
  SmlSearchResult,
  SmlIndexAttachmentParams,
} from './services/sml';

export { smlElasticsearchIndexMappings, smlIndexName } from './services/sml/sml_storage';

export const plugin: PluginInitializer<
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
  AgentBuilderSetupDependencies,
  AgentBuilderStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<AgentBuilderConfig>) => {
  return new AgentBuilderPlugin(pluginInitializerContext);
};

export { config } from './config';

export { ExecutionStatus } from './services/execution';
