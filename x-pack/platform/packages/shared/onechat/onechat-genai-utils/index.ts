/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  esqlResponseToJson,
  flattenMappings,
  cleanupMapping,
  type MappingField,
} from './tools/utils';
export {
  getDocumentById,
  type GetDocumentByIdResult,
  getIndexMappings,
  type GetIndexMappingEntry,
  type GetIndexMappingsResult,
  executeEsql,
  type EsqlResponse,
  listIndices,
  type ListIndexInfo,
} from './tools/steps';
export {
  indexExplorer,
  type IndexExplorerResponse,
  generateEsql,
  type GenerateEsqlResponse,
  relevanceSearch,
  type RelevanceSearchResponse,
  naturalLanguageSearch,
  type NaturalLanguageSearchResponse,
} from './tools';
