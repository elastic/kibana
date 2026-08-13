/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthorKind } from '../storage/memory_storage';

/**
 * The resolved author key used to scope memories.
 *
 * `author_kind` records which field `author` came from so Phase 3 can tighten
 * the model without a migration — today username is accepted as a fallback,
 * Phase 3 will reject pure-username callers if needed.
 */
export interface ResolvedIdentity {
  /** The scoping key stored in `memory.provenance.author`. */
  author: string;
  /** Whether `author` is a `profile_uid` or a `username`. */
  author_kind: AuthorKind;
}

/**
 * Minimal auth interface accepted by `resolveIdentity`.
 *
 * Using a structural (duck-typed) interface here means the function accepts
 * both `SecurityServiceStart.authc` (core) and `SecurityPluginStart.authc`
 * (plugin) without importing from either package — only `getCurrentUser` is
 * required.
 */
export interface MinimalAuthService {
  authc: {
    getCurrentUser(request: KibanaRequest): { profile_uid?: string; username?: string } | null;
  };
}

/**
 * Resolves the caller identity from the request.
 *
 * Preference order:
 *  1. `profile_uid` — stable across realms; preferred.
 *  2. `username`    — accepted as fallback for API-key callers that have no profile.
 *
 * Returns `undefined` when neither is available (e.g. anonymous or internal
 * requests without user context). Callers must reject the `remember` operation
 * in that case rather than writing an unscopeable memory.
 */
export const resolveIdentity = ({
  request,
  security,
}: {
  request: KibanaRequest;
  security: MinimalAuthService;
}): ResolvedIdentity | undefined => {
  const authUser = security.authc.getCurrentUser(request);

  if (authUser?.profile_uid) {
    return { author: authUser.profile_uid, author_kind: 'profile_uid' };
  }

  if (authUser?.username) {
    return { author: authUser.username, author_kind: 'username' };
  }

  return undefined;
};
