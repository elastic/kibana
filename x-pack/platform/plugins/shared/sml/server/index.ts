/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type {
  SmlPluginSetup,
  SmlPluginStart,
  SmlSetupDependencies,
  SmlStartDependencies,
} from './types';
import { SmlPlugin } from './plugin';

export type { SmlPluginSetup, SmlPluginStart } from './types';

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
  SmlServiceSetup,
  SmlServiceInstance,
  SmlTypeRegistry,
  SmlIndexer,
  SmlResolvedItemResult,
  SmlAttachmentOutput,
} from './services';

export {
  smlElasticsearchIndexMappings,
  smlIndexName,
  smlCrawlerStateIndexName,
  isNotFoundError,
  resolveSmlAttachItems,
  SML_CRAWLER_TASK_TYPE,
} from './services';

export {
  SML_HTTP_SEARCH_QUERY_MAX_LENGTH,
  SML_HTTP_ATTACH_ITEMS_MAX,
  type SmlSearchHttpResponse,
  type SmlSearchHttpResultItem,
  type SmlAttachHttpResponse,
  type SmlAttachHttpResultItem,
  type SmlAttachHttpSuccessItem,
  type SmlAttachHttpErrorItem,
} from '../common/http_api/sml';

export const plugin: PluginInitializer<
  SmlPluginSetup,
  SmlPluginStart,
  SmlSetupDependencies,
  SmlStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext) => {
  return new SmlPlugin(pluginInitializerContext);
};
