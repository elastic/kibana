/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import {
  type AccessOperation,
  type AccessPolicy,
  type AclChange,
  AclChangeError,
  type AclDecision,
  type AclDocument,
  type AclInput,
  type AclObjectDecision,
  type AclWarning,
  buildAclReadFilter,
  type CanonicalAcl,
  compareLevels,
  type EntryLevel,
  evaluateAcl,
  generalAccessPermits,
  prepareAclChange,
  prepareInitialAcl,
  type Principal,
  RESERVED_OPERATIONS,
  toObjectDecision,
} from '@kbn/access-control';
import type { CoreScopedAccessControl, KibanaRequest } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';

import type { AclServiceStartParams } from './acl_service';
import {
  accessControlAuditEvent,
  type AccessControlAuditEventParams,
  createScopedAuditLogger,
  recordDeniedObject,
} from './audit';
import { resolvePrincipal } from './principal';

/**
 * Privilege action that grants recovery authority over objects of a type in a space. No feature
 * privilege includes it: only wildcard application privileges, such as those of `superuser`, do.
 */
const RECOVERY_OPERATION = 'manage_access_control';

/**
 * Space ID that a search across all spaces passes. Recovery for it is checked globally.
 */
const ALL_SPACES_ID = '*';

/**
 * State shared by every scoped service created for one request, so that the principal is resolved
 * and recovery checked at most once per request.
 */
export interface RequestState {
  principal?: Promise<Principal | undefined>;
  /** Recovery answers, keyed by `type:spaceId`. */
  recovery: Map<string, Promise<boolean>>;
  /** Audit events already written for this request. */
  auditedEvents: Set<string>;
  /** Objects already reported as having a damaged ACL. */
  reportedInvalidAcls: Set<string>;
}

/**
 * Object-level security for one request.
 */
export class ScopedAclService implements CoreScopedAccessControl {
  private readonly auditLogger: AuditLogger;

  constructor(
    private readonly params: AclServiceStartParams,
    private readonly request: KibanaRequest,
    private readonly state: RequestState
  ) {
    this.auditLogger = createScopedAuditLogger(params.audit.asScoped(request));
  }

  public isEnabled() {
    return this.params.enabled;
  }

  public getPolicy(type: string) {
    return this.params.typeRegistry.getAccessPolicy(type);
  }

  public async getPrincipal() {
    if (!this.state.principal) {
      this.state.principal = resolvePrincipal({
        request: this.request,
        clusterClient: this.params.clusterClient,
        getAuthenticatedPrincipal: this.params.getAuthenticatedPrincipal,
        getCurrentProfileId: (request) => this.params.userProfiles.getCurrentProfileId({ request }),
        logger: this.params.logger,
      });
    }
    return await this.state.principal;
  }

  public primeRecovery(type: string, spaceIds: string[], granted: boolean) {
    for (const spaceId of spaceIds) {
      this.state.recovery.set(getRecoveryKey(type, spaceId), Promise.resolve(granted));
    }
  }

  /**
   * Returns the full decision for one object, limited by the request's feature privileges. One
   * privilege request answers both the feature privileges and recovery.
   */
  public async evaluate({
    type,
    spaceId,
    acl,
  }: {
    type: string;
    spaceId: string;
    acl?: CanonicalAcl;
  }): Promise<AclDecision> {
    const policy = this.requirePolicy(type);
    const recoveryAction = this.getRecoveryAction(type);
    const operationActions = new Map(
      Object.entries(policy.operations).map(([name, operation]) => [
        name,
        this.getPrivilegeActions(operation),
      ])
    );

    const { privileges } = await this.params.authz
      .checkPrivilegesWithRequest(this.request)
      .atSpace(spaceId, {
        kibana: [...new Set([...[...operationActions.values()].flat(), recoveryAction])],
      });
    const granted = new Set(
      privileges.kibana.filter(({ authorized }) => authorized).map(({ privilege }) => privilege)
    );

    const recovery = this.isEnabled() && granted.has(recoveryAction);
    this.primeRecovery(type, [spaceId], recovery);

    const decision = evaluateAcl({ policy, acl, principal: await this.getPrincipal(), recovery });

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
      viaRecovery: new Set([...decision.viaRecovery].filter(isAllowedByFeature)),
    };
  }

  /**
   * Decides one operation for objects of one type. Feature privileges are not checked here: the
   * caller has already authorized the operation for the type.
   */
  public async authorize({
    type,
    spaceId,
    operation,
    objects,
  }: {
    type: string;
    spaceId: string;
    operation: string;
    objects: Array<{ id: string; acl?: CanonicalAcl }>;
  }): Promise<Map<string, AclObjectDecision>> {
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
    const operationLevel = policy.operations[operation]?.level;
    for (const { id, acl } of objectsToCheck) {
      this.reportInvalidAcl(type, id, acl);

      let decision = evaluateAcl({ policy, acl, principal });
      if (decision.operations.has(operation)) {
        // Access that relied on ownership or a named grant, rather than on general access.
        if (operationLevel && compareLevels(operationLevel, 'use') >= 0) {
          this.audit({ action: 'access_control_access', type, id, spaceId, operation, principal });
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
      if (objectDecision.status === 'allowed') {
        this.audit({
          action: 'access_control_admin_override',
          type,
          id,
          spaceId,
          operation,
          principal,
        });
      } else {
        recordDeniedObject(type, id);
        this.audit({ action: 'access_control_denied', type, id, spaceId, operation, principal });
      }
    }

    return decisions;
  }

  public async filterVisible<T extends { id: string; acl?: CanonicalAcl }>({
    type,
    spaceId,
    objects,
  }: {
    type: string;
    spaceId: string;
    objects: T[];
  }): Promise<T[]> {
    const decisions = await this.authorize({ type, spaceId, operation: 'view', objects });
    return objects.filter(({ id }) => decisions.get(id)?.status === 'allowed');
  }

  /**
   * Returns the clause that keeps the objects of a type the request can view, or `undefined` when
   * nothing needs to be filtered.
   */
  public async getReadFilter({ type, spaceIds }: { type: string; spaceIds: string[] }) {
    const policy = this.getPolicy(type);
    if (!policy || !this.isEnabled()) {
      return;
    }

    const recoverySpaces: string[] = [];
    const ordinarySpaces: string[] = [];
    const principal = await this.getPrincipal();
    for (const spaceId of spaceIds) {
      if (await this.hasRecovery(type, spaceId)) {
        recoverySpaces.push(spaceId);
        this.audit({
          action: 'access_control_admin_override',
          type,
          spaceId,
          operation: 'find',
          principal,
        });
      } else {
        ordinarySpaces.push(spaceId);
      }
    }

    return buildAclReadFilter({ policy, principal, level: 'view', recoverySpaces, ordinarySpaces });
  }

  /**
   * Checks requested initial access before creation side effects run.
   */
  public async validateInitialAcl(params: {
    type: string;
    spaceId: string;
    requested?: AclInput;
  }): Promise<void> {
    try {
      await this.getInitialAcl(params);
    } catch (error) {
      if (error instanceof AclChangeError) {
        throw Boom.badRequest(error.message);
      }
      throw error;
    }
  }

  /**
   * Returns the ACL to store with a new object: the caller becomes the owner, with the requested
   * or default access. Throws `AclChangeError` when the request is not allowed.
   */
  public async getInitialAcl({
    type,
    requested,
  }: {
    type: string;
    spaceId: string;
    requested?: AclInput;
  }): Promise<AclDocument | undefined> {
    const prepared = prepareInitialAcl({
      policy: this.requirePolicy(type),
      principal: this.isEnabled() ? await this.getPrincipal() : undefined,
      requested,
      enabled: this.isEnabled(),
      now: new Date().toISOString(),
    });
    if (prepared) {
      await this.validateRecipients(prepared.grantsToCheck);
    }
    return prepared?.next;
  }

  /**
   * Authorizes an access change and returns the ACL to store, with warnings about recipients whose
   * feature privileges limit their grant. Throws `AclChangeError` when the change is not allowed.
   */
  public async authorizeChange({
    type,
    id,
    spaceId,
    acl,
    change,
  }: {
    type: string;
    id: string;
    spaceId: string;
    acl?: CanonicalAcl;
    change: AclChange;
  }): Promise<{ next: AclDocument; warnings: AclWarning[] }> {
    const policy = this.requirePolicy(type);
    if (!this.isEnabled()) {
      throw new AclChangeError('bad_request', 'Access control is disabled.');
    }

    const decision = await this.evaluate({ type, spaceId, acl });
    const principal = await this.getPrincipal();
    const { next, grantsToCheck } = prepareAclChange({
      policy,
      current: acl,
      decision,
      principal,
      change,
      enabled: true,
      now: new Date().toISOString(),
    });
    await this.validateRecipients(grantsToCheck);

    const operation = change.kind === 'replace' ? 'manage_access' : change.kind;
    const viaRecovery = decision.viaRecovery.has(
      change.kind === 'replace' ? 'manage_access' : 'transfer'
    );
    if (change.kind === 'replace') {
      this.audit({
        action: 'access_control_update',
        type,
        id,
        spaceId,
        operation,
        principal,
        details: describeAccess(acl, next),
      });
    } else {
      this.audit({
        action: 'access_control_transfer',
        type,
        id,
        spaceId,
        operation,
        principal,
        details: `(owner: ${describePrincipal(acl?.owner)} -> ${
          next.owner ? `${next.owner.type}:${next.owner.id}` : 'none'
        })`,
      });
    }
    if (viaRecovery && change.kind !== 'claim') {
      this.audit({
        action: 'access_control_admin_override',
        type,
        id,
        spaceId,
        operation,
        principal,
      });
    }

    return { next, warnings: await this.getRecipientWarnings(policy, spaceId, next) };
  }

  /**
   * Checks that new or increased grants, and a new owner, name principals that exist. Unchanged or
   * reduced grants are never checked, so a deleted recipient cannot block unrelated changes.
   */
  private async validateRecipients(principals: Principal[]) {
    const userIds = principals.filter(({ type }) => type === 'user').map(({ id }) => id);
    if (userIds.length > 0) {
      const profiles = await this.params.userProfiles.bulkGet({ uids: new Set(userIds) });
      const enabledIds = new Set(profiles.filter(({ enabled }) => enabled).map(({ uid }) => uid));
      const unknownUser = userIds.find((id) => !enabledIds.has(id));
      if (unknownUser) {
        throw new AclChangeError('bad_request', `User ${unknownUser} cannot receive access.`);
      }
    }

    for (const { type, id } of principals) {
      if (type === 'service_account' && !(await this.params.serviceAccountExists(id))) {
        throw new AclChangeError('bad_request', `Service account ${id} cannot receive access.`);
      }
    }
  }

  /**
   * Returns a warning for each user entry whose feature privileges do not allow every operation of
   * its level. The grant is stored anyway: it applies as soon as the user gets the privileges.
   */
  private async getRecipientWarnings(
    policy: AccessPolicy,
    spaceId: string,
    acl: AclDocument
  ): Promise<AclWarning[]> {
    const warnings: AclWarning[] = [];
    for (const level of policy.entryLevels) {
      const entries = acl.entries.filter(
        (entry) => entry.type === 'user' && entry.access === level
      );
      if (entries.length === 0) {
        continue;
      }

      const { hasPrivilegeUids } = await this.params.authz
        .checkUserProfilesPrivileges(new Set(entries.map(({ id }) => id)))
        .atSpace(spaceId, { kibana: this.getLevelPrivilegeActions(policy, level) });
      const allowed = new Set(hasPrivilegeUids);
      for (const { type, id } of entries) {
        if (!allowed.has(id)) {
          warnings.push({ principal: { type, id }, level, reason: 'missing_feature_privileges' });
        }
      }
    }
    return warnings;
  }

  /**
   * Returns the privilege actions every operation up to `level` needs.
   */
  public getLevelPrivilegeActions(policy: AccessPolicy, level: EntryLevel) {
    return [
      ...new Set(
        Object.values(policy.operations)
          .filter((operation) => compareLevels(operation.level, level) <= 0)
          .flatMap((operation) => this.getPrivilegeActions(operation))
      ),
    ];
  }

  private async hasRecovery(type: string, spaceId: string) {
    const key = getRecoveryKey(type, spaceId);
    let recovery = this.state.recovery.get(key);
    if (!recovery) {
      const checkPrivileges = this.params.authz.checkPrivilegesWithRequest(this.request);
      const payload = { kibana: [this.getRecoveryAction(type)] };
      recovery = (
        spaceId === ALL_SPACES_ID
          ? checkPrivileges.globally(payload)
          : checkPrivileges.atSpace(spaceId, payload)
      ).then(({ hasAllRequested }) => hasAllRequested);
      this.state.recovery.set(key, recovery);
    }
    return await recovery;
  }

  private getRecoveryAction(type: string) {
    return this.params.authz.actions.savedObject.get(type, RECOVERY_OPERATION);
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
      throw new AclChangeError('bad_request', `Type ${type} does not support access control.`);
    }
    return policy;
  }

  /**
   * Logs a damaged ACL once per request and object. It is an operational warning, not an audit
   * event: the object is still protected.
   */
  private reportInvalidAcl(type: string, id: string, acl?: CanonicalAcl) {
    const key = `${type}:${id}`;
    if (acl && evaluateAcl({ policy: this.requirePolicy(type), acl }).state === 'invalid') {
      if (!this.state.reportedInvalidAcls.has(key)) {
        this.state.reportedInvalidAcls.add(key);
        this.params.logger.warn(`Invalid ACL on ${key}`);
      }
    }
  }

  /**
   * Writes an audit event once per request, action, object, and operation. The principal is set
   * only for requests that have no authenticated user, such as background tasks.
   */
  private audit({ principal, ...params }: AccessControlAuditEventParams) {
    const key = `${params.action}:${params.type}:${params.id ?? params.spaceId}:${
      params.operation
    }`;
    if (this.state.auditedEvents.has(key)) {
      return;
    }
    this.state.auditedEvents.add(key);
    this.auditLogger.log(
      accessControlAuditEvent({
        ...params,
        principal: this.request.isFakeRequest ? principal : undefined,
      })
    );
  }
}

const getRecoveryKey = (type: string, spaceId: string) => `${type}:${spaceId}`;

const describePrincipal = (owner?: CanonicalAcl['owner']) =>
  owner && owner.id.length > 0 ? `${owner.type.join('|')}:${owner.id.join('|')}` : 'none';

/**
 * Summarizes an access change for audit: general access and named entries, before and after.
 */
const describeAccess = (before: CanonicalAcl | undefined, after: AclDocument) => {
  const entries = (acl: AclDocument['entries']) =>
    acl.map(({ type, id, access }) => `${type}:${id}=${access}`).join(',') || 'none';
  const beforeEntries = before
    ? before.entries
        .map((entry) => `${entry.type.join('|')}:${entry.id.join('|')}=${entry.access.join('|')}`)
        .join(',') || 'none'
    : 'none';
  return (
    `(general access: ${before?.general_access.join('|') || 'default'} -> ${
      after.general_access
    }; ` + `entries: ${beforeEntries} -> ${entries(after.entries)})`
  );
};
