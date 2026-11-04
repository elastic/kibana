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

import { getRecoveryAction, getSavedObjectActionPrefix } from './recovery';
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
  private policyTypesByActionPrefix?: Map<string, string>;

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

  /**
   * Returns the recovery actions that a privilege check of the given Kibana privileges should answer
   * on the side, mapped to their type: one for each type with an access policy that the check already
   * asks a Saved Objects privilege about. Empty while OLS is disabled.
   */
  public getRecoveryActions(kibanaPrivileges: readonly string[]): Map<string, string> {
    const recoveryActions = new Map<string, string>();
    if (!this.params.enabled) {
      return recoveryActions;
    }

    for (const [prefix, type] of this.getPolicyTypesByActionPrefix()) {
      if (kibanaPrivileges.some((privilege) => privilege.startsWith(prefix))) {
        recoveryActions.set(getRecoveryAction(this.params.authz.actions, type), type);
      }
    }
    return recoveryActions;
  }

  private getPolicyTypesByActionPrefix() {
    // Types cannot be registered after Kibana starts, so the lookup is built once.
    this.policyTypesByActionPrefix ??= new Map(
      this.params.typeRegistry
        .getAllTypes()
        .filter(({ name }) => this.params.typeRegistry.getAccessPolicy(name))
        .map(({ name }) => [getSavedObjectActionPrefix(this.params.authz.actions, name), name])
    );
    return this.policyTypesByActionPrefix;
  }
}
