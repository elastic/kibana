/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type {
  AgentContextLayerPluginSetup,
  AgentContextLayerPluginStart,
  AgentContextLayerSetupDependencies,
  AgentContextLayerStartDependencies,
} from './types';

export type {
  AgentContextLayerPluginSetup,
  AgentContextLayerPluginStart,
  SmlIndexAttachmentParams,
  SmlIndexAttachmentOriginParams,
  SmlIndexAttachmentContentParams,
  SmlDeleteAttachmentParams,
} from './types';

export type {
  SmlTypeDefinition,
  SmlChunk,
  SmlData,
  SmlContext,
  SmlToAttachmentContext,
  SmlListItem,
  SmlSearchResult,
  SmlSearchConstraints,
  SmlSearchFilters,
  SmlDocument,
  SmlIndexAction,
  SmlIngestionMethod,
  SmlDeleteScope,
  SmlIndexAttachmentOriginMode,
  SmlIndexAttachmentContentMode,
} from './services/sml/types';

export type {
  SmlResolver,
  SmlResolverContext,
  SmlResolverItem,
  SmlResolverRegistry,
  ParsedOriginId,
} from './services/sml/resolvers';

export {
  parseOriginId,
  formatOriginId,
  KIBANA_RESOLVER_TYPE,
  ES_DOCUMENT_RESOLVER_TYPE,
  ES_INDEX_RESOLVER_TYPE,
} from './services/sml/resolvers';

export type { SmlResolvedItemResult } from './services/sml/execute_sml_attach_items';
export { smlElasticsearchIndexMappings, smlIndexName } from './services/sml/sml_storage';
export { SmlSearchFilterType } from '../common/http_api/sml';

export const plugin: PluginInitializer<
  AgentContextLayerPluginSetup,
  AgentContextLayerPluginStart,
  AgentContextLayerSetupDependencies,
  AgentContextLayerStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext) => {
  const { AgentContextLayerPlugin } = await import('./plugin');
  return new AgentContextLayerPlugin(pluginInitializerContext);
};
