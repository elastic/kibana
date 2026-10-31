/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Principal } from '@kbn/access-control';
import type {
  IClusterClient,
  ISavedObjectTypeRegistry,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { AuthenticatedPrincipal } from '@kbn/core-security-common';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';

import { type RequestState, ScopedAclService } from './scoped_acl_service';
import type { AuthorizationServiceSetupInternal } from '../authorization';

export interface AclServiceStartParams {
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
 * Platform object-level security runtime. One instance serves the Saved Objects ACL extension, the
 * access control API, and consumers that reach it through `core.security.accessControl`.
 */
export class AclService {
  private readonly requestStates = new WeakMap<KibanaRequest, RequestState>();

  constructor(private readonly params: AclServiceStartParams) {}

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

    return new ScopedAclService(this.params, request, state);
  }
}
