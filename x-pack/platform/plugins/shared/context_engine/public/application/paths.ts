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
  detailSettings: '/ai_index/:id/settings',
  dreamingTemplate: '/ai_index/:id/dreaming_template',
} as const;

/** Query param that holds the id of the Knowledge document selected on the tab. */
export const KI_DOC_QUERY_PARAM = 'doc';

export const getAiIndexDetailPath = (id: string): string => `/ai_index/${id}`;

export const getAiIndexSourcesPath = (id: string): string => `/ai_index/${id}/sources`;

export const getAiIndexKnowledgeDocumentsPath = (id: string): string =>
  `/ai_index/${id}/knowledge_documents`;

export const getAiIndexSettingsPath = (id: string): string => `/ai_index/${id}/settings`;

/** Path of the page for picking an example dreaming config for a new AI index with memory. */
export const getAiIndexDreamingTemplatePath = (id: string): string =>
  `/ai_index/${id}/dreaming_template`;

/**
 * Path of the Knowledge documents tab with a backing index selected. Index names can't contain
 * `/`, `?`, `#` or spaces, so the index is safe in the path. Document ids are free text, so they
 * go in the `doc` query param (the same pattern as Discover's single document page).
 */
export const getKnowledgeDocumentPath = (aiIndexId: string, index: string): string =>
  `${getAiIndexKnowledgeDocumentsPath(aiIndexId)}/${encodeURIComponent(index)}`;

/** Path and query params that open one Knowledge document on the Knowledge documents tab. */
export const getKnowledgeDocumentLocation = (
  aiIndexId: string,
  { id, index }: { id: string; index: string }
): { path: string; params: Record<string, string> } => ({
  path:
    index.length > 0
      ? getKnowledgeDocumentPath(aiIndexId, index)
      : getAiIndexKnowledgeDocumentsPath(aiIndexId),
  params: { [KI_DOC_QUERY_PARAM]: id },
});
