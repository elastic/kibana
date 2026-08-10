/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * In-app routes for the Context Engine application, relative to {@link CONTEXT_ENGINE_APP_PATH}.
 *
 * These live in `common/` rather than `public/` so that other plugins linking into the Context
 * Engine (for example Agent Builder's Context page) can share a single source of truth instead of
 * duplicating the path strings.
 */
export const CONTEXT_ENGINE_PATHS = {
  landing: '/',
  create: '/ai_index/create',
  detail: '/ai_index/:id',
} as const;

export const getAiIndexDetailPath = (id: string): string => `/ai_index/${id}`;
