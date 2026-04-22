/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import { SemanticLayerPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new SemanticLayerPlugin(initializerContext);
}

export type {
  SemanticLayerPluginSetup,
  SemanticLayerPluginStart,
  SemanticLayerIndexAttachmentParams,
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
} from './services/sml';

export { smlElasticsearchIndexMappings, smlIndexName } from './services/sml/sml_storage';

export {
  resolveSmlAttachItems,
  type SmlResolvedItemResult,
} from './services/sml/execute_sml_attach_items';
