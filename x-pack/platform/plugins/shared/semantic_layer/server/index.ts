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
  SmlCrawlerStateDocument,
  SmlCrawler,
  SmlIndexAction,
  SmlIndexAttachmentParams,
  SmlService,
} from './services/sml/types';

export type { SmlServiceSetup, SmlServiceInstance } from './services/sml/sml_service';
export { createSmlService, isNotFoundError } from './services/sml/sml_service';
export { createSmlTypeRegistry, type SmlTypeRegistry } from './services/sml/sml_type_registry';
export { createSmlIndexer, type SmlIndexer } from './services/sml/sml_indexer';
export {
  registerSmlCrawlerTaskDefinition,
  scheduleSmlCrawlerTasks,
  SML_CRAWLER_TASK_TYPE,
} from './services/sml/sml_task_definitions';
export { resolveSmlAttachItems } from './services/sml/execute_sml_attach_items';
export { smlElasticsearchIndexMappings, smlIndexName } from './services/sml/sml_storage';

export const plugin: PluginInitializer<
  SemanticLayerPluginSetup,
  SemanticLayerPluginStart,
  SemanticLayerSetupDependencies,
  SemanticLayerStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext) => {
  return new SemanticLayerPlugin(pluginInitializerContext);
};
