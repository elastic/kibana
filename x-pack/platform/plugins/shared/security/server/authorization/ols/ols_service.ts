/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IClusterClient,
  ISavedObjectTypeRegistry,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { AuthenticatedPrincipal } from '@kbn/core-security-common';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import type { Principal } from '@kbn/ols';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';

import { type RequestState, ScopedOlsService } from './scoped_ols_service';
import type { AuthorizationServiceSetupInternal } from '..';

export interface OlsServiceStartParams {
  /** Whether platform object-level security is enforced. Trusted deployment configuration. */
  enabled: boolean;
  clusterClient: IClusterClient;
  authz: Pick<
    AuthorizationServiceSetupInternal,
    'actions' | 'checkPrivilegesWithRequest' | 'checkUserProfilesPrivileges'
  >;
  audit: AuditServiceSetup;
  typeRegistry: ISavedObjectTypeRegistry;
  userProfiles: Pick<UserProfileServiceStart, 'getCurrentProfileId' | 'bulkGet'>;
  getAuthenticatedPrincipal: (request: KibanaRequest) => AuthenticatedPrincipal | null;
  /** Whether Kibana manages a service account with the given ID. */
  serviceAccountExists: (id: string) => Promise<boolean>;
  logger: Logger;
}

/**
 * Object-level security (OLS) runtime. One instance serves the Saved Objects OLS extension, the OLS
 * API, and consumers that reach it through `core.security.authz.ols`.
 */
export class OlsService {
  private readonly requestStates = new WeakMap<KibanaRequest, RequestState>();

  constructor(private readonly params: OlsServiceStartParams) {}

  /**
   * Whether OLS is enforced. Only Security reads it: the Saved Objects extension and the OLS API keep
   * running while OLS is disabled, but consumers outside Security get `core.security.authz.ols: null`.
   */
  public isEnabled() {
    return this.params.enabled;
  }

  /**
   * Returns the service scoped to a request.
   */
  public asScoped(request: KibanaRequest, { principal }: { principal?: Principal } = {}) {
    let state = this.requestStates.get(request);
    if (!state) {
      state = { recovery: new Map(), auditedEvents: new Set(), reportedInvalidAcls: new Set() };
      this.requestStates.set(request, state);
    }

    // A credential minted in this request on behalf of a principal cannot be looked up yet, so the
    // caller vouches for it. Every later scoped service for this request reuses the answer.
    if (principal) {
      state.principal = Promise.resolve(principal);
    }

    return new ScopedOlsService(this.params, request, state);
  }
}
