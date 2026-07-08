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
  ContextEngineIndexAttachmentParams,
  ContextEngineIndexAttachmentOriginParams,
  ContextEngineIndexAttachmentContentParams,
  ContextEngineDeleteAttachmentParams,
} from './types';

export type {
  ContextEngineTypeDefinition,
  ContextEngineEntry,
  ContextEngineData,
  ContextEngineContext,
  ContextEngineToAttachmentContext,
  ContextEngineListItem,
  ContextEnginePermissions,
  ContextEngineKibanaPrivilege,
  ContextEngineElasticsearchIndex,
  ContextEngineSearchResult,
  ContextEngineSearchConstraints,
  ContextEngineSearchFilters,
  ContextEngineDocument,
  ContextEngineIndexAction,
  ContextEngineIngestionMethod,
  ContextEngineDeleteScope,
  ContextEngineIndexAttachmentOriginMode,
  ContextEngineIndexAttachmentContentMode,
} from './services/engine/types';

export { kibanaSavedObjectPermissions } from './services/engine/permissions/kibana_saved_object';

export type { ContextEngineResolvedItemResult } from './services/engine/execute_attach_items';
export {
  contextEngineElasticsearchIndexMappings,
  contextEngineIndexName,
} from './services/engine/storage';
export { ContextEngineSearchFilterType } from '../common/http_api/context_engine';

export const plugin: PluginInitializer<
  ContextEnginePluginSetup,
  ContextEnginePluginStart,
  ContextEngineSetupDependencies,
  ContextEngineStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext) => {
  const { ContextEnginePlugin } = await import('./plugin');
  return new ContextEnginePlugin(pluginInitializerContext);
};
