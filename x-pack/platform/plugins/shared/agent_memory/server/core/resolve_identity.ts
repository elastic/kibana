/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthorKind } from '../storage/memory_storage';

/**
 * The resolved user identity used for scope and creator provenance.
 *
 * `author_kind` records which field `author` came from. Username fallbacks are
 * realm-qualified so equal usernames in different realms cannot share memory.
 */
export interface ResolvedIdentity {
  /** Stored in `memory.scope_id` for personal scope and as creator provenance on create. */
  author: string;
  /** Whether `author` is a `profile_uid` or a `username`. */
  author_kind: AuthorKind;
}

/**
 * Minimal auth interface accepted by `resolveIdentity`.
 *
 * Callers must supply **core's** security service (`CoreStart['security']`),
 * not `SecurityPluginStart`. Only core's `getCurrentUser` consults the fake
 * request enrichment map, which is what makes identity resolvable when the
 * agent builder runs a conversation on Task Manager. The plugin contract reads
 * auth state off the HTTP request and returns `null` for every fake request.
 *
 * The interface is structural so this module does not depend on core-security
 * types; only `getCurrentUser` is required.
 */
export interface MinimalAuthService {
  authc: {
    getCurrentUser(request: KibanaRequest): {
      profile_uid?: string;
      username?: string;
      /** Required for username fallback; both fields scope the fallback key. */
      authentication_realm?: { type: string; name: string };
    } | null;
  };
}

/**
 * Resolves the caller identity from the request.
 *
 * Preference order:
 *  1. `profile_uid` — stable across realms; preferred.
 *  2. `realm-type/realm-name:username` — only when an authentication realm is
 *     available. Both realm fields prevent cross-realm collisions.
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

  const realm = authUser?.authentication_realm;
  if (authUser?.username && realm) {
    return {
      author: `${realm.type}/${realm.name}:${authUser.username}`,
      author_kind: 'username',
    };
  }

  return undefined;
};
