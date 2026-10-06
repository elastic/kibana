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
  kiDetail: '/ai_index/:id/ki/:kiId',
} as const;

export const getAiIndexDetailPath = (id: string): string => `/ai_index/${id}`;

/** The `index` (backing store) of the KI must be passed as the `index` query param. */
export const getKiDetailPath = (aiIndexId: string, kiId: string): string =>
  `/ai_index/${aiIndexId}/ki/${kiId}`;
