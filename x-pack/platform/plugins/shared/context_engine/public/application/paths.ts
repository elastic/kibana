/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CONTEXT_ENGINE_PATHS = {
  landing: '/',
  create: '/ai_index/create',
  detail: '/ai_index/:id',
  viewKi: '/ai_index/:id/ki/:kiId*',
} as const;

export const getAiIndexDetailPath = (id: string): string => `/ai_index/${id}`;

/**
 * KI ids are free-form (set by automations, no format restriction) and can
 * contain any character, so they're percent-encoded to stay a single path
 * segment. The `index` (backing store) of the KI must be passed as the
 * `index` query param.
 */
export const getViewKiPath = (aiIndexId: string, kiId: string): string =>
  `/ai_index/${aiIndexId}/ki/${encodeURIComponent(kiId)}`;

/**
 * Best-effort decode for a KI id read from the URL. `history` already runs
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
