/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { KibanaRequest } from '@kbn/core/server';
import { ALL_SPACES_ID, DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  type AccessOperation,
  type AccessPolicy,
  type Acl,
  type AclChange,
  AclChangeError,
  type AclDecision,
  type AclObjectDecision,
  type AclWarning,
  buildAclReadFilter,
  type EntryAccess,
  evaluateAcl,
  generalAccessPermits,
  getOperationsAtAccess,
  type InitialAccess,
  ObjectAccessError,
  prepareAclChange,
  prepareInitialAcl,
  type Principal,
  RESERVED_OPERATIONS,
  type StoredAcl,
  toObjectDecision,
} from '@kbn/ols';
import type { AuditEvent, AuditLogger } from '@kbn/security-plugin-types-server';

import { olsAuditEvent, type OlsAuditEventParams } from './audit';
import type { OlsServiceStartParams } from './ols_service';
import { resolvePrincipal } from './principal';
import { validateRecipients } from './recipients';
import { getRecoveryAction } from './recovery';
import { type RequestState, syncCredential } from './request_state';

/**
 * Parameters shared by the methods that decide one operation for objects of one type.
 */
export interface OlsObjectAccessParams {
  /** The object type. */
  type: string;
  /** The space the objects are in. */
  spaceId: string;
  /** The operation to decide, as named by the type's access policy. */
  operation: string;
  /** The objects, each with its stored ACL. */
  objects: Array<{ id: string; acl?: StoredAcl }>;
}

/**
 * Parameters of {@link ScopedOlsServiceContract.getPermissions}.
 */
export interface OlsGetPermissionsParams {
  /** The object type. */
  type: string;
  /** The space the object is in. */
  spaceId: string;
  /** The object's stored ACL. */
  acl?: StoredAcl;
}

/**
 * Parameters of {@link ScopedOlsService.filterVisible}.
 */
export interface OlsFilterVisibleParams<T extends { id: string; acl?: StoredAcl }> {
  /** The object type. */
  type: string;
  /** The space the objects are in. */
  spaceId: string;
  /** The objects, each with its stored ACL. */
  objects: T[];
}

/**
 * Parameters of {@link ScopedOlsService.getReadFilter}.
 */
export interface OlsGetReadFilterParams {
  /** The object type. */
  type: string;
  /** The spaces the search covers, `*` meaning every space. */
  spaceIds: string[];
}

/**
 * Parameters of {@link ScopedOlsService.validateInitialAcl}.
 */
export interface OlsValidateInitialAclParams {
  /** The type of the new object. */
  type: string;
  /** The space the object is created in. */
  spaceId: string;
  /** The access the caller asks for. The type's default applies when it's left out. */
  requested?: InitialAccess;
}

/**
 * Parameters of {@link ScopedOlsService.prepareInitialAcl}.
 */
export interface OlsPrepareInitialAclParams extends OlsValidateInitialAclParams {
  /**
   * The ID the new object is stored with, for the audit event. Every caller that stores the object
   * knows it, generated or not, before it asks for the ACL.
   */
  id: string;
}

/**
 * Parameters of {@link ScopedOlsService.authorizeChange}.
 */
export interface OlsAuthorizeChangeParams {
  /** The object type. */
  type: string;
  /** The object ID. */
  id: string;
  /** The space the object is in. */
  spaceId: string;
  /** The object's stored ACL. */
  acl?: StoredAcl;
  /** The change the caller asks for. */
  change: AclChange;
}

/**
 * An authorized access change, ready to store.
 */
export interface OlsAuthorizedChange {
  /** The complete ACL to store. */
  next: Acl;
  /** Grants the recipients can't fully use yet. */
  warnings: AclWarning[];
  /**
   * Audit events for the change. The caller logs them once the change is stored, so that a failed
   * write leaves no event for a change that never happened.
   */
  auditEvents: AuditEvent[];
}

/**
 * Object-level security (OLS) for one request, as other code uses it.
 */
export interface ScopedOlsServiceContract {
  /** @returns `true` when OLS is enforced. */
  isEnabled(): boolean;
  /** See {@link ScopedOlsService.getPrincipal}. */
  getPrincipal(): Promise<Principal | undefined>;
  /** See {@link ScopedOlsService.getPermissions}. */
  getPermissions(params: OlsGetPermissionsParams): Promise<AclDecision>;
  /** See {@link ScopedOlsService.authorizeObjectAccess}. */
  authorizeObjectAccess(params: OlsObjectAccessParams): Promise<Map<string, AclObjectDecision>>;
  /** See {@link ScopedOlsService.ensureObjectAccess}. */
  ensureObjectAccess(params: OlsObjectAccessParams): Promise<void>;
  /** See {@link ScopedOlsService.filterVisible}. */
  filterVisible<T extends { id: string; acl?: StoredAcl }>(
    params: OlsFilterVisibleParams<T>
  ): Promise<T[]>;
  /** See {@link ScopedOlsService.getReadFilter}. */
  getReadFilter(
    params: OlsGetReadFilterParams
  ): Promise<estypes.QueryDslQueryContainer | undefined>;
  /** See {@link ScopedOlsService.validateInitialAcl}. */
  validateInitialAcl(params: OlsValidateInitialAclParams): Promise<void>;
  /** See {@link ScopedOlsService.prepareInitialAcl}. */
  prepareInitialAcl(params: OlsPrepareInitialAclParams): Promise<Acl | undefined>;
  /** See {@link ScopedOlsService.authorizeChange}. */
  authorizeChange(params: OlsAuthorizeChangeParams): Promise<OlsAuthorizedChange>;
}

/**
 * Object-level security for one request. `primeRecovery` is for Security's privilege checks only,
 * and is not part of {@link ScopedOlsServiceContract}.
 */
export class ScopedOlsService implements ScopedOlsServiceContract {
  private readonly auditLogger: AuditLogger;

  constructor(
    private readonly params: OlsServiceStartParams,
    private readonly request: KibanaRequest,
    private readonly state: RequestState
  ) {
    this.auditLogger = params.audit.asScoped(request);
  }

  /**
   * @returns `true` when OLS is enforced.
   */
  public isEnabled(): boolean {
    return this.params.enabled;
  }

  /**
   * Returns the principal the request acts as. Resolved at most once per request, and again when
   * the request's credential changes.
   *
   * @returns The principal, or `undefined` when the request acts as nobody that can own or receive
   *   access, or OLS is disabled.
   * @throws When the principal lookup itself fails.
   */
  public async getPrincipal(): Promise<Principal | undefined> {
    if (!this.isEnabled()) {
      return;
    }

    this.syncCredential();
    if (!this.state.principal) {
      this.state.principal = resolvePrincipal({
        request: this.request,
        getAuthenticatedPrincipal: this.params.getAuthenticatedPrincipal,
        getApiKeyProfileId: (request) => this.params.userProfiles.getApiKeyProfileId(request),
        getCurrentProfileId: (request) => this.params.userProfiles.getCurrentProfileId({ request }),
        hasSession: this.params.hasSession,
        logger: this.params.logger,
      });
    }

    return await this.state.principal;
  }

  /**
   * Stores a recovery answer that a privilege check already has, so that no second privilege
   * request is needed. Every request-scoped privilege check primes it, see
   * `checkPrivilegesFactory`.
   *
   * @param type The object type.
   * @param spaceIds The spaces the answer is for. `*` means the check ran globally.
   * @param granted Whether the request holds recovery authority.
   */
  public primeRecovery(type: string, spaceIds: string[], granted: boolean): void {
    this.syncCredential();

    for (const spaceId of spaceIds) {
      this.state.recovery.set(getRecoveryKey(type, spaceId), Promise.resolve(granted));
      // Without Spaces, a check that ran globally is the answer for the default space, which is
      // the space every object is in and the one OLS asks about.
      if (spaceId === ALL_SPACES_ID && !this.params.spacesEnabled) {
        this.state.recovery.set(getRecoveryKey(type, DEFAULT_SPACE_ID), Promise.resolve(granted));
      }
    }
  }

  /**
   * Builds the full decision for one object, from both the request's feature privileges for each
   * operation of the type's policy and the object's ACL. Use it to show what the caller can do
   * with an object, or to decide an access change. One privilege request answers both feature
   * privileges and recovery. To decide one operation that the caller has already authorized for
   * the type, use {@link authorizeObjectAccess} instead: it skips that request when general access
   * already allows the operation.
   *
   * While OLS is disabled, the stored ACL is ignored: the caller gets every ordinary operation its
   * feature privileges allow, and no access management.
   *
   * @param params See {@link OlsGetPermissionsParams}.
   * @returns The decision for the object.
   * @throws {AclChangeError} `bad_request` when the type has no access policy.
   */
  public async getPermissions({
    type,
    spaceId,
    acl,
  }: OlsGetPermissionsParams): Promise<AclDecision> {
    const policy = this.requirePolicy(type);
    const enabled = this.isEnabled();
    const recoveryAction = getRecoveryAction(this.params.authz.actions, type);
    const operationActions = new Map(
      Object.entries(policy.operations).map(([name, operation]) => [
        name,
        this.getPrivilegeActions(operation),
      ])
    );

    const { privileges } = await this.params.authz
      .checkPrivilegesWithRequest(this.request)
      .atSpace(spaceId, {
        kibana: [
          ...new Set([
            ...[...operationActions.values()].flat(),
            ...(enabled ? [recoveryAction] : []),
          ]),
        ],
      });
    const granted = new Set(
      privileges.kibana.filter(({ authorized }) => authorized).map(({ privilege }) => privilege)
    );

    let decision: AclDecision;
    if (enabled) {
      const recovery = granted.has(recoveryAction);
      this.primeRecovery(type, [spaceId], recovery);
      decision = evaluateAcl({ policy, acl, principal: await this.getPrincipal(), recovery });
    } else {
      decision = {
        state: evaluateAcl({ policy, acl }).state,
        access: 'edit',
        isOwner: false,
        restricted: false,
        operations: getOperationsAtAccess(policy, 'edit'),
        operationsViaRecovery: new Set(),
      };
    }

    // Object-level grants never exceed feature privileges. Access management and transfer need the
    // privileges of the type's `edit` operation.
    const isAllowedByFeature = (operation: string) => {
      const actions = (RESERVED_OPERATIONS as readonly string[]).includes(operation)
        ? operationActions.get('edit')
        : operationActions.get(operation);
      return !!actions && actions.every((action) => granted.has(action));
    };
    return {
      ...decision,
      operations: new Set([...decision.operations].filter(isAllowedByFeature)),
      operationsViaRecovery: new Set(
        [...decision.operationsViaRecovery].filter(isAllowedByFeature)
      ),
    };
  }

  /**
   * Decides one operation for objects of one type, from their ACLs only. Feature privileges are
   * not checked here: the caller must have authorized the operation for the type already, as the
   * Saved Objects security extension does. Objects whose general access permits the operation need
   * no lookup. Denials, and access that relied on a grant or on recovery, are audited.
   *
   * @param params See {@link OlsObjectAccessParams}.
   * @returns The decision for each object, keyed by object ID.
   */
  public async authorizeObjectAccess({
    type,
    spaceId,
    operation,
    objects,
  }: OlsObjectAccessParams): Promise<Map<string, AclObjectDecision>> {
    const policy = this.getPolicy(type);
    const decisions = new Map<string, AclObjectDecision>(
      objects.map(({ id }) => [id, { status: 'allowed' }])
    );

    // Objects whose general access permits the operation cost nothing: no principal lookup, no
    // privilege request, and no audit event, exactly as before object-level security.
    const objectsToCheck =
      policy && this.isEnabled()
        ? objects.filter(({ acl }) => !generalAccessPermits(policy, acl, operation))
        : [];
    if (!policy || objectsToCheck.length === 0) {
      return decisions;
    }

    const principal = await this.getPrincipal();
    // Viewing comes with every access, so only an operation that needs more is audited.
    const needsMoreThanView =
      operation in policy.operations && !getOperationsAtAccess(policy, 'view').has(operation);
    for (const { id, acl } of objectsToCheck) {
      this.reportInvalidAcl(type, id, acl);

      let decision = evaluateAcl({ policy, acl, principal });
      if (decision.operations.has(operation)) {
        // Access that relied on ownership or a named grant, rather than on general access.
        if (needsMoreThanView) {
          this.audit({ action: 'ols_access', type, id, spaceId, operation, principal });
        }
        continue;
      }

      // Recovery decides between allowing a view, reporting a forbidden operation on an object the
      // caller can see, and masking the object as missing. It is checked only on this path.
      if (await this.hasRecovery(type, spaceId)) {
        decision = evaluateAcl({ policy, acl, principal, recovery: true });
      }

      const objectDecision = toObjectDecision(decision, operation);
      decisions.set(id, objectDecision);
      this.audit({
        action: objectDecision.status === 'allowed' ? 'ols_admin_override' : 'ols_denied',
        type,
        id,
        spaceId,
        operation,
        principal,
      });
    }

    return decisions;
  }

  /**
   * Decides one operation for objects of one type, as {@link authorizeObjectAccess} does, and
   * throws on the first object the caller can't use. Feature privileges are not checked here.
   *
   * @param params See {@link OlsObjectAccessParams}.
   * @throws {ObjectAccessError} `not_found` when the caller can't view an object, so that it looks
   *   missing, and `forbidden` when the caller can view it but can't perform the operation.
   */
  public async ensureObjectAccess(params: OlsObjectAccessParams): Promise<void> {
    const decisions = await this.authorizeObjectAccess(params);
    for (const { id } of params.objects) {
      const status = decisions.get(id)?.status;
      if (status === 'not_found' || status === 'forbidden') {
        throw new ObjectAccessError(status, params.type, id, params.operation);
      }
    }
  }

  /**
   * Returns the objects the caller can view, in input order, for a list. Hidden objects are left
   * out without an event each, as a search leaves them out. A recovery override is audited once
   * for the list, and only when a restricted object makes it matter.
   *
   * @param params See {@link OlsFilterVisibleParams}.
   * @returns The objects the caller can view.
   */
  public async filterVisible<T extends { id: string; acl?: StoredAcl }>({
    type,
    spaceId,
    objects,
  }: OlsFilterVisibleParams<T>): Promise<T[]> {
    const policy = this.getPolicy(type);
    const restricted =
      policy && this.isEnabled()
        ? objects.filter(({ acl }) => !generalAccessPermits(policy, acl, 'view'))
        : [];
    if (!policy || restricted.length === 0) {
      return objects;
    }

    const principal = await this.getPrincipal();
    const recovery = await this.hasRecovery(type, spaceId);
    if (recovery) {
      this.audit({ action: 'ols_admin_override', type, spaceId, operation: 'find', principal });
    }

    const hiddenIds = new Set<string>();
    for (const { id, acl } of restricted) {
      this.reportInvalidAcl(type, id, acl);
      if (!evaluateAcl({ policy, acl, principal, recovery }).operations.has('view')) {
        hiddenIds.add(id);
      }
    }
    return objects.filter(({ id }) => !hiddenIds.has(id));
  }

  /**
   * Returns the clause that keeps the objects of a type the request can view in the given spaces.
   *
   * @param params See {@link OlsGetReadFilterParams}.
   * @returns The clause, or `undefined` when nothing needs to be filtered.
   */
  public async getReadFilter({
    type,
    spaceIds,
  }: OlsGetReadFilterParams): Promise<estypes.QueryDslQueryContainer | undefined> {
    const policy = this.getPolicy(type);
    if (!policy || !this.isEnabled()) {
      return;
    }

    const recoverySpaces: string[] = [];
    const ordinarySpaces: string[] = [];
    this.checkRecoveryAtSpaces(type, spaceIds);
    const [principal, recovery] = await Promise.all([
      this.getPrincipal(),
      Promise.all(spaceIds.map((spaceId) => this.hasRecovery(type, spaceId))),
    ]);
    spaceIds.forEach((spaceId, index) => {
      if (recovery[index]) {
        recoverySpaces.push(spaceId);
        this.audit({ action: 'ols_admin_override', type, spaceId, operation: 'find', principal });
      } else {
        ordinarySpaces.push(spaceId);
      }
    });

    return buildAclReadFilter({
      policy,
      principal,
      access: 'view',
      recoverySpaces,
      ordinarySpaces,
    });
  }

  /**
   * Returns the ACL to store with a new object and audits it as `ols_create`. The caller becomes
   * the owner, with the requested or default access. Recipients are checked once per request, so a
   * call after {@link validateInitialAcl} makes no lookups.
   *
   * @param params See {@link OlsPrepareInitialAclParams}.
   * @returns The ACL to store, or `undefined` when the object is created without one.
   * @throws {AclChangeError} `bad_request` when the type has no access policy, or when the requested
   *   access is not allowed.
   */
  public async prepareInitialAcl({
    type,
    spaceId,
    requested,
    id,
  }: OlsPrepareInitialAclParams): Promise<Acl | undefined> {
    const principal = await this.getPrincipal();
    const prepared = await this.prepareAndCheckInitialAcl(type, principal, requested);
    if (!prepared) {
      return;
    }

    this.audit({
      action: 'ols_create',
      type,
      id,
      spaceId,
      operation: 'create',
      principal,
      details: describeAccess(undefined, prepared.next),
    });
    return prepared.next;
  }

  /**
   * Checks requested initial access before creation side effects run, with the same rules as
   * {@link prepareInitialAcl}. It stores and audits nothing, so it needs no object ID.
   *
   * @param params See {@link OlsValidateInitialAclParams}.
   * @throws {AclChangeError} `bad_request` when the type has no access policy, or when the requested
   *   access is not allowed.
   */
  public async validateInitialAcl({ type, requested }: OlsValidateInitialAclParams): Promise<void> {
    const principal = await this.getPrincipal();
    await this.prepareAndCheckInitialAcl(type, principal, requested);
  }

  /**
   * Authorizes an access change and returns the ACL to store, with warnings about recipients
   * whose feature privileges limit their grant and the audit events to log once it is stored. A
   * refused change is audited here as `ols_denied`.
   *
   * @param params See {@link OlsAuthorizeChangeParams}.
   * @returns See {@link OlsAuthorizedChange}.
   * @throws {AclChangeError} When the change is not allowed, OLS is disabled, or the type has no
   *   access policy.
   */
  public async authorizeChange({
    type,
    id,
    spaceId,
    acl,
    change,
  }: OlsAuthorizeChangeParams): Promise<OlsAuthorizedChange> {
    const policy = this.requirePolicy(type);
    if (!this.isEnabled()) {
      throw new AclChangeError('bad_request', 'Object-level security (OLS) is disabled.');
    }

    const operation = change.kind === 'replace' ? 'manage_access' : change.kind;
    const decision = await this.getPermissions({ type, spaceId, acl });
    const principal = await this.getPrincipal();

    let next: Acl;
    try {
      let principalsToCheck: Principal[];
      ({ next, principalsToCheck } = prepareAclChange({
        policy,
        current: acl,
        decision,
        principal,
        change,
        enabled: true,
        now: new Date().toISOString(),
      }));
      await this.validateRecipients(principalsToCheck);
    } catch (error) {
      // A refusal is audited even though nothing is stored. That includes a caller who can't view
      // the object and so gets the same answer as for a missing one.
      if (
        error instanceof AclChangeError &&
        (error.code === 'forbidden' || error.code === 'not_found')
      ) {
        this.audit({ action: 'ols_denied', type, id, spaceId, operation, principal });
      }
      throw error;
    }

    const auditEvents = [
      this.createAuditEvent(
        change.kind === 'replace'
          ? {
              action: 'ols_update',
              type,
              id,
              spaceId,
              operation,
              principal,
              details: describeAccess(acl, next),
            }
          : {
              action: 'ols_transfer',
              type,
              id,
              spaceId,
              operation,
              principal,
              // A claim can also set general access, so it records both, not only the owner.
              details: `(owner: ${describeStoredPrincipal(acl?.owner)} -> ${describePrincipal(
                next.owner
              )})${change.kind === 'claim' ? ` ${describeAccess(acl, next)}` : ''}`,
            }
      ),
    ];
    const viaRecovery = decision.operationsViaRecovery.has(
      change.kind === 'replace' ? 'manage_access' : 'transfer'
    );
    if (viaRecovery && change.kind !== 'claim') {
      auditEvents.push(
        this.createAuditEvent({
          action: 'ols_admin_override',
          type,
          id,
          spaceId,
          operation,
          principal,
        })
      );
    }

    return {
      next,
      warnings: await this.getRecipientWarnings(policy, spaceId, next, change),
      auditEvents,
    };
  }

  private getPolicy(type: string) {
    return this.params.policies.getAccessPolicy(type);
  }

  /**
   * Returns the privilege actions that every operation an access permits needs. The access doesn't
   * have to be one the type lets entries grant.
   */
  private getAccessPrivilegeActions(policy: AccessPolicy, access: EntryAccess) {
    return [
      ...new Set(
        [...getOperationsAtAccess(policy, access)].flatMap((name) => {
          const operation = policy.operations[name];
          return operation ? this.getPrivilegeActions(operation) : [];
        })
      ),
    ];
  }

  private async prepareAndCheckInitialAcl(
    type: string,
    principal: Principal | undefined,
    requested: InitialAccess | undefined
  ) {
    const prepared = prepareInitialAcl({
      policy: this.requirePolicy(type),
      principal,
      requested,
      enabled: this.isEnabled(),
      now: new Date().toISOString(),
    });
    if (prepared) {
      await this.validateRecipients(prepared.principalsToCheck);
    }
    return prepared;
  }

  private validateRecipients(principals: Principal[]) {
    return validateRecipients(this.state.recipients, this.params, principals);
  }

  /**
   * Returns a warning for each user whose feature privileges do not allow the access they get: an
   * entry's operations at its access, and the `edit` operation that a new owner needs to manage
   * access. The access is stored anyway: it applies as soon as the user gets the privileges.
   */
  private async getRecipientWarnings(
    policy: AccessPolicy,
    spaceId: string,
    acl: Acl,
    change: AclChange
  ): Promise<AclWarning[]> {
    const usersByAccess = new Map<EntryAccess, Set<string>>();
    for (const { type, id, access } of acl.entries) {
      if (type === 'user') {
        usersByAccess.set(access, (usersByAccess.get(access) ?? new Set()).add(id));
      }
    }

    const warnings: AclWarning[] = [];
    for (const [access, userIds] of usersByAccess) {
      for (const id of await this.findUsersWithoutPrivileges(
        userIds,
        spaceId,
        this.getAccessPrivilegeActions(policy, access)
      )) {
        warnings.push({
          target: 'entry',
          principal: { type: 'user', id },
          access,
          reason: 'missing_feature_privileges',
        });
      }
    }

    // A transfer drops the former owner, so a new owner who can't edit leaves nobody but a recovery
    // administrator able to manage the object.
    if (change.kind === 'transfer' && acl.owner.type === 'user') {
      const [ownerId] = await this.findUsersWithoutPrivileges(
        new Set([acl.owner.id]),
        spaceId,
        this.getPrivilegeActions(policy.operations.edit)
      );
      if (ownerId) {
        warnings.push({
          target: 'owner',
          principal: { type: 'user', id: ownerId },
          reason: 'missing_feature_privileges',
        });
      }
    }
    return warnings;
  }

  private async findUsersWithoutPrivileges(
    userIds: Set<string>,
    spaceId: string,
    kibana: string[]
  ): Promise<string[]> {
    const { hasPrivilegeUids } = await this.params.authz
      .checkUserProfilesPrivileges(userIds)
      .atSpace(spaceId, { kibana });
    const allowed = new Set(hasPrivilegeUids);
    return [...userIds].filter((id) => !allowed.has(id));
  }

  private syncCredential() {
    syncCredential(this.state, this.request, this.params.getAuthenticatedPrincipal);
  }

  /**
   * Checks recovery in one privilege request for the spaces that have no answer yet, so a search
   * across several spaces costs one request rather than one per space. A space needs the same
   * privileges as for {@link hasRecovery}: the recovery action and the login action.
   */
  private checkRecoveryAtSpaces(type: string, spaceIds: string[]) {
    this.syncCredential();

    const unchecked = [...new Set(spaceIds)].filter(
      (spaceId) =>
        spaceId !== ALL_SPACES_ID && !this.state.recovery.has(getRecoveryKey(type, spaceId))
    );
    if (unchecked.length < 2) {
      return;
    }

    const { actions } = this.params.authz;
    const required = [getRecoveryAction(actions, type), actions.login];
    const response = this.params.authz
      .checkPrivilegesWithRequest(this.request)
      .atSpaces(unchecked, { kibana: required });
    for (const spaceId of unchecked) {
      this.state.recovery.set(
        getRecoveryKey(type, spaceId),
        response.then(({ privileges }) =>
          required.every((privilege) =>
            privileges.kibana.some(
              (entry) =>
                entry.resource === spaceId && entry.privilege === privilege && entry.authorized
            )
          )
        )
      );
    }
  }

  private async hasRecovery(type: string, spaceId: string) {
    this.syncCredential();

    const key = getRecoveryKey(type, spaceId);
    let recovery = this.state.recovery.get(key);
    if (!recovery) {
      const checkPrivileges = this.params.authz.checkPrivilegesWithRequest(this.request);
      const payload = { kibana: [getRecoveryAction(this.params.authz.actions, type)] };
      recovery = (
        spaceId === ALL_SPACES_ID
          ? checkPrivileges.globally(payload)
          : checkPrivileges.atSpace(spaceId, payload)
      ).then(({ hasAllRequested }) => hasAllRequested);
      this.state.recovery.set(key, recovery);
    }
    return await recovery;
  }

  private getPrivilegeActions({ privileges }: AccessOperation) {
    const { actions } = this.params.authz;
    return [
      ...(privileges.savedObject ?? []).map(({ type, operation }) =>
        actions.savedObject.get(type, operation)
      ),
      ...(privileges.api ?? []).map((api) => actions.api.get(api)),
    ];
  }

  private requirePolicy(type: string) {
    const policy = this.getPolicy(type);
    if (!policy) {
      throw new AclChangeError(
        'bad_request',
        `Type ${type} does not support object-level security (OLS).`
      );
    }
    return policy;
  }

  /**
   * Logs a damaged ACL once per request and object. It is an operational warning, not an audit
   * event: the object is still protected.
   */
  private reportInvalidAcl(type: string, id: string, acl?: StoredAcl) {
    const key = `${type}:${id}`;
    if (acl && evaluateAcl({ policy: this.requirePolicy(type), acl }).state === 'invalid') {
      if (!this.state.reportedInvalidAcls.has(key)) {
        this.state.reportedInvalidAcls.add(key);
        this.params.logger.warn(`Invalid ACL on ${key}`);
      }
    }
  }

  /**
   * Creates an audit event. The principal is set only for requests that have no authenticated
   * user, such as background tasks.
   */
  private createAuditEvent({ principal, ...params }: OlsAuditEventParams) {
    return olsAuditEvent({
      ...params,
      principal: this.request.isFakeRequest ? principal : undefined,
    });
  }

  /**
   * Writes an audit event once per request, action, object, and operation.
   */
  private audit(params: OlsAuditEventParams) {
    const key = `${params.action}:${params.type}:${params.id ?? params.spaceId}:${
      params.operation
    }`;
    if (this.state.auditedEvents.has(key)) {
      return;
    }

    this.state.auditedEvents.add(key);
    this.auditLogger.log(this.createAuditEvent(params));
  }
}

const getRecoveryKey = (type: string, spaceId: string) => `${type}:${spaceId}`;

const describePrincipal = ({ type, id }: Principal) => `${type}:${id}`;

const describeStoredPrincipal = (owner?: StoredAcl['owner']) =>
  owner && owner.id.length > 0 ? `${owner.type.join('|')}:${owner.id.join('|')}` : 'none';

/**
 * Summarizes access for audit: general access and named entries, before and after.
 */
const describeAccess = (before: StoredAcl | undefined, after: Acl) => {
  const entries = (acl: Acl['entries']) =>
    acl.map(({ type, id, access }) => `${type}:${id}=${access}`).join(',') || 'none';
  const beforeEntries = before
    ? before.entries
        .map((entry) => `${entry.type.join('|')}:${entry.id.join('|')}=${entry.access.join('|')}`)
        .join(',') || 'none'
    : 'none';
  return (
    `(general access: ${before?.general.access.join('|') || 'default'} -> ${
      after.general.access
    }; ` + `entries: ${beforeEntries} -> ${entries(after.entries)})`
  );
};
