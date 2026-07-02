/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type {
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies,
} from './types';

export type {
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  CeIndexAttachmentParams,
  CeIndexAttachmentOriginParams,
  CeIndexAttachmentContentParams,
  CeDeleteAttachmentParams,
} from './types';

export type {
  CeTypeDefinition,
  CeEntry,
  CeData,
  CeContext,
  CeToAttachmentContext,
  CeListItem,
  CeSearchResult,
  CeSearchConstraints,
  CeSearchFilters,
  CeDocument,
  CeIndexAction,
  CeIngestionMethod,
  CeDeleteScope,
  CeIndexAttachmentOriginMode,
  CeIndexAttachmentContentMode,
} from './services/ce/types';

export type { CeResolvedItemResult } from './services/ce/execute_ce_attach_items';
export { ceElasticsearchIndexMappings, ceIndexName } from './services/ce/ce_storage';
export { CeSearchFilterType } from '../common/http_api/ce';

export const plugin: PluginInitializer<
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext) => {
  const { ContextEnginePlugin } = await import('./plugin');
  return new ContextEnginePlugin(pluginInitializerContext);
};
