/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AI_MEMORY_INDEX_PREFIX } from './constants';

export const MEMORY_KI_TYPES = ['memory.session', 'memory.session_fact'] as const;

export const MEMORY_AI_INDEX_ID = 'memory';
export const MEMORY_AI_INDEX_DEST = `${AI_MEMORY_INDEX_PREFIX}elastic`;
export const MEMORY_AI_INDEX_DESCRIPTION =
  'Memories recorded by Agent Builder agents, private to the user who recorded them.';

/** KI type declared under `aiIndex.read` by the Context Engine feature; grants `ai_index:memory/read`. */
export const MEMORY_AI_INDEX_READ_KI_TYPE = 'memory';
export const MEMORY_READ_ACTION = `ai_index:${MEMORY_AI_INDEX_READ_KI_TYPE}/read`;

/** Multi-valued keyword of principal URIs that may read a memory; absent means shared. */
export const MEMORY_SCOPE_ID_FIELD = 'scope_id';
export const USER_SCOPE_PREFIX = 'user://';
export const MAX_MEMORY_SCOPE_IDS = 20;
export const MAX_MEMORY_SCOPE_ID_LENGTH = 256;

export const buildUserScopeId = (profileUid: string): string => `${USER_SCOPE_PREFIX}${profileUid}`;

export const buildUserScopeIds = (profileUid: string | undefined): string[] =>
  profileUid ? [buildUserScopeId(profileUid)] : [];

export const isUserScopeId = (scopeId: string): boolean => scopeId.startsWith(USER_SCOPE_PREFIX);

export const isMemoryAiIndexDest = (destValue: string): boolean =>
  destValue.startsWith(AI_MEMORY_INDEX_PREFIX);
