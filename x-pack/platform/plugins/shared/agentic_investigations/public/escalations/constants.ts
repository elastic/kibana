/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * User profile suggest route. Owned by the `agentBuilder` plugin
 * (`agent_builder/server/routes/internal/access_principals.ts`).
 * Escalations are Agent Builder conversations, so they share the same privilege
 * domain and can reuse this picker endpoint without a dedicated route.
 */
export const AGENT_BUILDER_SUGGEST_USER_PROFILES_PATH =
  '/internal/agent_builder/_suggest_user_profiles' as const;

/** Number of suggestions to request from the picker endpoint. */
export const SUGGEST_USER_PROFILES_SIZE = 20;

/** dataPath token to request avatar data alongside profile base fields. */
export const USER_PROFILE_AVATAR_DATA_PATH = 'avatar' as const;
