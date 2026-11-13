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
} as const;

/** Query params that hold the Knowledge document selected on the Knowledge documents tab. */
export const KI_DOC_QUERY_PARAM = 'doc';
export const KI_INDEX_QUERY_PARAM = 'index';

export const getAiIndexDetailPath = (id: string): string => `/ai_index/${id}`;

export const getAiIndexSourcesPath = (id: string): string => `/ai_index/${id}/sources`;

export const getAiIndexKnowledgeDocumentsPath = (id: string): string =>
  `/ai_index/${id}/knowledge_documents`;

/**
 * Query params that select a Knowledge document on the Knowledge documents tab.
 * `index` is the backing store of the document (ids are only unique per index).
 */
export const getKiDocQueryParams = (kiId: string, index: string): Record<string, string> => ({
  [KI_DOC_QUERY_PARAM]: kiId,
  ...(index.length > 0 ? { [KI_INDEX_QUERY_PARAM]: index } : {}),
});
