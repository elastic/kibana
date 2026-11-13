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
  detailKnowledgeIndicators: '/ai_index/:id/knowledge_indicators',
  /** Old Knowledge document page links. They redirect to the Knowledge documents tab. */
  legacyViewKi: '/ai_index/:id/ki/:kiId',
  legacyViewKiDocument: '/ai_index/:id/ki/:kiId/document',
} as const;

/** Query params that hold the Knowledge document selected on the Knowledge documents tab. */
export const KI_DOC_QUERY_PARAM = 'doc';
export const KI_INDEX_QUERY_PARAM = 'index';

export const getAiIndexDetailPath = (id: string): string => `/ai_index/${id}`;

export const getAiIndexSourcesPath = (id: string): string => `/ai_index/${id}/sources`;

export const getAiIndexKnowledgeIndicatorsPath = (id: string): string =>
  `/ai_index/${id}/knowledge_indicators`;

/**
 * Query params that select a Knowledge document on the Knowledge documents tab.
 * `index` is the backing store of the document (ids are only unique per index).
 */
export const getKiDocQueryParams = (kiId: string, index: string): Record<string, string> => ({
  [KI_DOC_QUERY_PARAM]: kiId,
  ...(index.length > 0 ? { [KI_INDEX_QUERY_PARAM]: index } : {}),
});

/** Old Knowledge document page path. Only used by `KiPage`, removed with it. */
export const getViewKiPath = (aiIndexId: string, kiId: string): string =>
  `/ai_index/${aiIndexId}/ki/${encodeURIComponent(kiId)}`;

export const getViewKiDocumentPath = (aiIndexId: string, kiId: string): string =>
  `${getViewKiPath(aiIndexId, kiId)}/document`;

/**
 * Best-effort decode for a KI id read from an old `/ki/:kiId` URL. `history` already runs
 * `decodeURI` once, so a malformed leftover `%` throws here; falling back to
 * the raw value keeps the page from crashing. KI ids are free-form, so for
 * pathological content (e.g. a literal `%41` substring) this may not recover
 * the exact original id, in which case the KI simply fails to load instead
 * of rendering.
 */
export const decodeRouteParam = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};
