/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CONTEXT_ENGINE_PATHS = {
  landing: '/',
  detail: '/ai_index/:id',
  detailSources: '/ai_index/:id/sources',
  detailKnowledgeDocuments: '/ai_index/:id/knowledge_documents',
  /** A selected Knowledge document: backing index in the path, document id in `?doc=`. */
  detailKnowledgeDocument: '/ai_index/:id/knowledge_documents/:index',
} as const;

/** Query param that holds the id of the Knowledge document selected on the tab. */
export const KI_DOC_QUERY_PARAM = 'doc';

export const getAiIndexDetailPath = (id: string): string => `/ai_index/${id}`;

export const getAiIndexSourcesPath = (id: string): string => `/ai_index/${id}/sources`;

export const getAiIndexKnowledgeDocumentsPath = (id: string): string =>
  `/ai_index/${id}/knowledge_documents`;

/**
 * Path of the Knowledge documents tab with a backing index selected. Index names can't contain
 * `/`, `?`, `#` or spaces, so the index is safe in the path. Document ids are free text, so they
 * go in the `doc` query param (the same pattern as Discover's single document page).
 */
export const getKnowledgeDocumentPath = (aiIndexId: string, index: string): string =>
  `${getAiIndexKnowledgeDocumentsPath(aiIndexId)}/${encodeURIComponent(index)}`;
