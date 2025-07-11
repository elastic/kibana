/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Ids of built-in onechat tools
 */
export const builtinToolIds = {
  indexExplorer: 'index_explorer',
  relevanceSearch: 'relevance_search',
  naturalLanguageSearch: 'nl_search',
  listIndices: 'list_indices',
  getIndexMapping: 'get_index_mapping',
  getDocumentById: 'get_document_by_id',
  generateEsql: 'generate_esql',
  executeEsql: 'execute_esql',
  researcherAgent: 'researcher_agent',
};

export const builtInToolIdPrefix = '.';

/**
 * Common set of tags used for platform tools.
 */
export const builtinTags = {
  /**
   * Tag associated to tools related to data retrieval
   */
  retrieval: 'retrieval',
};
