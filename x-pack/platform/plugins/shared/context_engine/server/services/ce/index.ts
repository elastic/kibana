/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  CeService,
  CeTypeDefinition,
  CeEntry,
  CeData,
  CeContext,
  CeToAttachmentContext,
  CeListItem,
  CeSearchResult,
  CeDocument,
  CeCrawlerStateDocument,
  CeCrawler,
  CeIndexAction,
} from './types';
export {
  createCeService,
  isNotFoundError,
  type CeServiceSetup,
  type CeServiceInstance,
} from './ce_service';
export { createCeTypeRegistry, type CeTypeRegistry } from './ce_type_registry';
export { createCeIndexer, type CeIndexer } from './ce_indexer';
export {
  registerCeCrawlerTaskDefinition,
  scheduleCeCrawlerTasks,
  CE_CRAWLER_TASK_TYPE,
} from './ce_task_definitions';
export { resolveCeAttachItems } from './execute_ce_attach_items';
export { ceElasticsearchIndexMappings, ceIndexName } from './ce_storage';
