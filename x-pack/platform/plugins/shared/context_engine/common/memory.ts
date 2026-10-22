/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AI_INDEX_INDEX_PREFIX } from './constants';

export const MEMORY_KI_TYPES = ['memory.session', 'memory.session_fact'] as const;

export const MEMORY_AI_INDEX_ID = 'memory';
export const MEMORY_AI_INDEX_DEST = `${AI_INDEX_INDEX_PREFIX}elastic-memory`;
export const MEMORY_AI_INDEX_DESCRIPTION =
  'Memories recorded by Agent Builder agents, private to the user who recorded them.';

/** Elasticsearch slice metadata field. Memory indices are sliced by user id. */
export const MEMORY_SLICE_FIELD = '_slice';
export const MEMORY_SLICE_INDEX_SETTING = 'index.slice.enabled';

export const USER_SCOPE_PREFIX = 'user://';
export const buildUserScopeUri = (userId: string): string => `${USER_SCOPE_PREFIX}${userId}`;
