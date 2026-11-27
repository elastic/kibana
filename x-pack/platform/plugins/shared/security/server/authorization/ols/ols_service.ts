/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { AuthenticatedPrincipal } from '@kbn/core-security-common';
import type { AccessPolicy } from '@kbn/ols';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';

import type { RecipientLookups } from './recipients';
import { getRecoveryAction, getSavedObjectActionPrefix } from './recovery';
import { createRequestState, type RequestState } from './request_state';
import { ScopedOlsService, type ScopedOlsServiceContract } from './scoped_ols_service';
import type { AuthorizationServiceSetupInternal } from '..';
import type { UserProfileServiceStartInternal } from '../../user_profile';

/**
 * The access policies of object types, with the types they are registered for.
 */
export interface AccessPolicyRegistry {
  /**
   * @param type The object type.
   * @returns The access policy of the type, or `undefined` when the type has none.
   */
  getAccessPolicy(type: string): AccessPolicy | undefined;

  /**
   * @returns Every registered object type.
   */
  getAllTypes(): ReadonlyArray<{ name: string }>;
}

/**
 * Everything the object-level security (OLS) service needs from the rest of Kibana.
 */
export interface OlsServiceStartParams extends RecipientLookups {
  /** Whether platform object-level security is enforced. Trusted deployment configuration. */
  enabled: boolean;
  /**
   * Whether the Spaces plugin is enabled. Without it, a privilege check that ran globally answers
   * for the default space, the only space there is.
   */
  spacesEnabled: boolean;
  /** Cluster client, used to look up the creator of an API key. */
  clusterClient: IClusterClient;
  /** Privilege actions and checks of the Security plugin. */
  authz: Pick<
    AuthorizationServiceSetupInternal,
    'actions' | 'checkPrivilegesWithRequest' | 'checkUserProfilesPrivileges'
  >;
  /** Audit service that OLS events are written to. */
  audit: AuditServiceSetup;
  /** The access policies of object types. */
  policies: AccessPolicyRegistry;
  /** User profiles, used to resolve the caller and to check grant recipients. */
  userProfiles: Pick<
    UserProfileServiceStartInternal,
    'getCurrentProfileId' | 'bulkGet' | 'getApiKeyProfileId'
  >;
  /** Classifies the credential that authenticated a request. */
  getAuthenticatedPrincipal: (request: KibanaRequest) => AuthenticatedPrincipal | null;
  /** Whether a request carries a Kibana session cookie. */
  hasSession: (request: KibanaRequest) => Promise<boolean>;
  /** Logger for operational warnings, such as a damaged ACL. */
  logger: Logger;
}

/**
 * Object-level security (OLS) runtime. One instance serves every request: `asScoped` returns the
 * service for one request.
 */
export class OlsService {
  private readonly requestStates = new WeakMap<KibanaRequest, RequestState>();
  private policyTypesByActionPrefix?: Map<string, string>;

  constructor(private readonly params: OlsServiceStartParams) {}

  /**
   * Whether OLS is enforced. While it is disabled, the service allows every object and adds no
   * filters, and stored ACLs stay as they are.
   *
   * @returns `true` when OLS is enforced.
   */
  public isEnabled() {
    return this.params.enabled;
  }

  /**
   * Returns the service scoped to a request. Within one request, the principal is resolved at most
   * once and recovery is checked at most once per type and space.
   *
   * @param request The request to scope the service to.
   * @returns The service for the request.
   */
  public asScoped(request: KibanaRequest): ScopedOlsServiceContract {
    return this.scope(request);
  }

  /**
   * Stores a recovery answer that a request-scoped privilege check already has, so that OLS needs
   * no second privilege request. Only Security's privilege checks call this, see
   * `checkPrivilegesFactory`.
   *
   * @param request The request the check ran for.
   * @param type The object type.
   * @param spaceIds The spaces the answer is for. `*` means the check ran globally.
   * @param granted Whether the request holds recovery authority.
   */
  public primeRecovery(request: KibanaRequest, type: string, spaceIds: string[], granted: boolean) {
    this.scope(request).primeRecovery(type, spaceIds, granted);
  }

  /**
   * Returns the recovery actions that a privilege check of the given Kibana privileges should answer
   * on the side: one for each type with an access policy that the check already asks a Saved Objects
   * privilege about.
   *
   * @param kibanaPrivileges The Kibana privileges the check asks for.
   * @returns The recovery actions mapped to their type. Empty while OLS is disabled.
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
      this.params.policies
        .getAllTypes()
        .filter(({ name }) => this.params.policies.getAccessPolicy(name))
        .map(({ name }) => [getSavedObjectActionPrefix(this.params.authz.actions, name), name])
    );
    return this.policyTypesByActionPrefix;
  }

  private scope(request: KibanaRequest) {
    let state = this.requestStates.get(request);
    if (!state) {
      state = createRequestState();
      this.requestStates.set(request, state);
    }

    return new ScopedOlsService(this.params, request, state);
  }
}
