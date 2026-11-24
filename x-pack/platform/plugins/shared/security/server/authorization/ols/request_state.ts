/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AuthenticatedPrincipal } from '@kbn/core-security-common';
import { extractApiKeyIdFromAuthzHeader } from '@kbn/core-security-server';
import type { Principal } from '@kbn/ols';

/**
 * State shared by every scoped service created for one request, so that the principal is resolved
 * and recovery checked at most once per request.
 */
export interface RequestState {
  /**
   * The credential the principal and recovery answers belong to. When it changes, as when a
   * service-account request is released, both are dropped.
   */
  credential?: string;
  /** The principal of the request, once resolved. */
  principal?: Promise<Principal | undefined>;
  /** Recovery answers, keyed by `type:spaceId`. */
  recovery: Map<string, Promise<boolean>>;
  /** Audit events already written for this request. */
  auditedEvents: Set<string>;
  /** Objects already reported as having a damaged ACL. */
  reportedInvalidAcls: Set<string>;
  /** Whether each grant recipient exists, keyed by `type:id`, including lookups in progress. */
  recipients: Map<string, Promise<boolean>>;
}

export const createRequestState = (): RequestState => ({
  recovery: new Map(),
  auditedEvents: new Set(),
  reportedInvalidAcls: new Set(),
  recipients: new Map(),
});

/**
 * Drops the principal and recovery answers once the request carries another credential, as a
 * released service-account request does. A renewed token of the same account keeps them.
 *
 * @returns The credential the request carries now.
 */
export const syncCredential = (
  state: RequestState,
  request: KibanaRequest,
  getAuthenticatedPrincipal: (request: KibanaRequest) => AuthenticatedPrincipal | null
): string => {
  const credential = JSON.stringify([
    getAuthenticatedPrincipal(request),
    extractApiKeyIdFromAuthzHeader(request.headers.authorization),
  ]);
  if (state.credential !== undefined && state.credential !== credential) {
    state.principal = undefined;
    state.recovery.clear();
  }
  state.credential = credential;
  return credential;
};
