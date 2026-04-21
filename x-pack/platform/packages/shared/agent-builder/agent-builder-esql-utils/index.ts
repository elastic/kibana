/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  generateEsql,
  type GenerateEsqlResponse,
  type GenerateEsqlDeps,
  type GenerateEsqlOptions,
  type GenerateEsqlParams,
} from './tools/generate_esql';
export { indexExplorer, type IndexExplorerResponse } from './tools/index_explorer';
export {
  esqlResponseToJson,
  extractEsqlQueries,
  executeEsql,
  interpolateEsqlQuery,
  flattenMapping,
  cleanupMapping,
  getIndexMappings,
  getDataStreamMappings,
  type MappingField,
  processFieldCapsResponse,
  processFieldCapsResponsePerIndex,
  type FieldListFromFieldCapsResponse,
  isCcsTarget,
  partitionByCcs,
  getFieldsFromFieldCaps,
  getBatchedFieldsFromFieldCaps,
  getIndexFields,
  type IndexFieldsResult,
} from './tools/utils';
export { listSearchSources } from './tools/steps/list_search_sources';
