/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { FakeRequestEnricher } from '@kbn/core-security-server';
import type { Logger } from '@kbn/logging';
import { deepFreeze } from '@kbn/std';

/**
 * Identity fields blocked on the synthetic user produced by
 * {@link FakeRequestEnrichment.enrichRequestWithUserProfile}. Reading any of
 * these throws so callers can't derive identity from an enriched fake request;
 * only `profile_uid` is intentionally accessible.
 *
 * The `Record<keyof Omit<AuthenticatedUser, 'profile_uid'>, true>` shape forces
 * this list to stay in sync with the type — adding/removing a field on
 * `AuthenticatedUser` is a compile error until reflected here.
 */
const ENRICHED_USER_BLOCKED_PROPERTIES_RECORD: Record<
  keyof Omit<AuthenticatedUser, 'profile_uid'>,
  true
> = {
  username: true,
  email: true,
  full_name: true,
  roles: true,
  enabled: true,
  metadata: true,
  authentication_realm: true,
  lookup_realm: true,
  authentication_provider: true,
  authentication_type: true,
  elastic_cloud_user: true,
  operator: true,
  api_key: true,
};

const ENRICHED_USER_BLOCKED_PROPERTIES = new Set<string>(
  Object.keys(ENRICHED_USER_BLOCKED_PROPERTIES_RECORD)
);

/**
 * Snapshotted alongside the synthetic user so {@link getOverride} can detect a
 * post-enrichment swap of the `authorization` header — a confused-deputy where
 * the API key driving the request no longer matches the profile we promised
 * to expose.
 */
interface EnrichmentEntry {
  user: AuthenticatedUser;
  authorization: string | undefined;
}

export interface FakeRequestEnrichment {
  enrichRequestWithUserProfile: FakeRequestEnricher;
  getOverride(request: KibanaRequest): AuthenticatedUser | undefined;
}

const readAuthorization = (request: KibanaRequest): string | undefined => {
  const value = request.headers.authorization;
  return typeof value === 'string' ? value : undefined;
};

export const createFakeRequestEnrichment = (logger: Logger): FakeRequestEnrichment => {
  const fakeRequestEntries = new WeakMap<KibanaRequest, EnrichmentEntry>();

  const enrichRequestWithUserProfile: FakeRequestEnricher = (request, userProfileId) => {
    if (!request.isFakeRequest) {
      throw new Error(
        `enrichRequestWithUserProfile must only be called on a fake request ` +
          `(profile_uid="${userProfileId}").`
      );
    }

    if (fakeRequestEntries.has(request)) {
      logger.warn(
        `enrichRequestWithUserProfile called on an already-enriched fake request; ignoring ` +
          `the new enrichment (profile_uid="${userProfileId}").`
      );
      return;
    }

    logger.debug(`Enriching request with user profile ID "${userProfileId}".`);

    // Synthetic user that only exposes `profile_uid`. Reading any blocked
    // identity field throws; everything else (symbols, unknown props) falls
    // through to the empty target so JS reflection (`then`, `JSON.stringify`,
    // etc.) keeps working.
    const enrichedUserStub: Partial<AuthenticatedUser> = { profile_uid: userProfileId };
    const enrichedUser = deepFreeze(
      new Proxy(enrichedUserStub as AuthenticatedUser, {
        get: (target, prop, receiver) => {
          if (typeof prop === 'string' && ENRICHED_USER_BLOCKED_PROPERTIES.has(prop)) {
            throw new Error(
              `Property "${prop}" is not available on a fake request enriched ` +
                `with a user profile. Use profile_uid for per-user lookups.`
            );
          }
          return Reflect.get(target, prop, receiver);
        },
      })
    );

    fakeRequestEntries.set(request, {
      user: enrichedUser,
      authorization: readAuthorization(request),
    });
  };

  const getOverride = (request: KibanaRequest): AuthenticatedUser | undefined => {
    const entry = fakeRequestEntries.get(request);
    if (!entry) {
      return undefined;
    }

    // Fake request headers aren't frozen by the HTTP layer, so a downstream
    // caller could swap `authorization` after enrichment. Detect the mismatch
    // and refuse to vouch for the profile.
    const currentAuthorization = readAuthorization(request);
    if (currentAuthorization !== entry.authorization) {
      logger.error(
        `Authorization header on an enriched fake request was mutated after enrichment; ` +
          `refusing to expose the bound user profile to avoid a confused-deputy.`
      );
      return undefined;
    }

    return entry.user;
  };

  return {
    enrichRequestWithUserProfile,
    getOverride,
  };
};
