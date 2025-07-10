/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getDocumentById, type GetDocumentByIdResult } from './get_documents';
export {
  getIndexMappings,
  type GetIndexMappingEntry,
  type GetIndexMappingsResult,
} from './get_mappings';
export {
  performMatchSearch,
  type PerformMatchSearchResponse,
  type MatchResult,
} from './perform_match_search';
export { executeEsql, type EsqlResponse } from './execute_esql';
export { listIndices, type ListIndexInfo } from './list_indices';
