/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Ids of built-in onechat tools
 */
export const OnechatToolIds = {
  listIndices: 'list_indices',
  getIndexMapping: 'get_index_mapping',
  getDocumentById: 'get_document_by_id',
  searchDsl: 'search_dsl',
  searchFulltext: 'search_fulltext',
  rerankDocuments: 'rerank_documents',
  generateEsql: 'generate_esql',
};

/**
 * Common set of tags used for platform tools.
 */
export const OnechatToolTags = {
  /**
   * Tag associated to tools related to data retrieval
   */
  retrieval: 'retrieval',
};
