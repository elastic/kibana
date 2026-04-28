/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type {
  SemanticLayerPluginSetup,
  SemanticLayerPluginStart,
  SemanticLayerSetupDependencies,
  SemanticLayerStartDependencies,
} from './types';
import { SemanticLayerPlugin } from './plugin';

export type {
  SemanticLayerPluginSetup,
  SemanticLayerPluginStart,
  SmlIndexAttachmentParams,
} from './types';

export type {
  SmlTypeDefinition,
  SmlChunk,
  SmlData,
  SmlContext,
  SmlToAttachmentContext,
  SmlListItem,
  SmlSearchResult,
  SmlDocument,
  SmlIndexAction,
} from './services/sml/types';

export type { SmlResolvedItemResult } from './services/sml/execute_sml_attach_items';
export { smlElasticsearchIndexMappings, smlIndexName } from './services/sml/sml_storage';

export const plugin: PluginInitializer<
  SemanticLayerPluginSetup,
  SemanticLayerPluginStart,
  SemanticLayerSetupDependencies,
  SemanticLayerStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext) => {
  return new SemanticLayerPlugin(pluginInitializerContext);
};
