/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  SmlService,
  SmlTypeDefinition,
  SmlChunk,
  SmlData,
  SmlContext,
  SmlToAttachmentContext,
  SmlListItem,
  SmlConversationAttachment,
  SmlSearchResult,
  SmlDocument,
  SmlCrawlerStateDocument,
  SmlIndexAction,
  SmlIndexAttachmentParams,
} from './types';
export {
  createSmlService,
  isNotFoundError,
  type SmlServiceSetup,
  type SmlServiceInstance,
} from './sml_service';
export { createSmlTypeRegistry, type SmlTypeRegistry } from './sml_type_registry';
export { createSmlIndexer, type SmlIndexer } from './sml_indexer';
export { createSmlCrawler, type SmlCrawler } from './sml_crawler';
export {
  registerSmlCrawlerTaskDefinition,
  scheduleSmlCrawlerTasks,
  SML_CRAWLER_TASK_TYPE,
} from './sml_task_definitions';
