/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import Boom from '@hapi/boom';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { FeaturesPluginStart } from '@kbn/features-plugin/server';
import type { Space, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { CASE_SAVED_OBJECT } from '../../common/constants';
import type { CaseAccess, CaseAssignees } from '../../common/types/domain';
import { CaseAccessMode } from '../../common/types/domain';
import type { AuthFilterHelpers, OwnerEntity } from './types';
import {
  combineFilterWithAuthorizationFilter,
  getCaseAccessFilter,
  getOwnersFilter,
  groupByAuthorization,
} from './utils';
import type { OperationDetails } from '.';
import { AuthorizationAuditLogger } from '.';
import { createCaseError } from '../common/error';

/**
 * Audit-log error carrying the real denial reason for a restricted case. The
 * error returned to the caller is a plain not-found so the case's existence is
 * not revealed.
 */
class RestrictedCaseAccessError extends Error {
  constructor() {
    super('Access to a restricted case was denied because the user is not an assignee');
    this.name = 'RestrictedCaseAccessDenied';
  }
}

const createRestrictedCaseNotFoundError = (id: string) =>
  Boom.notFound(`Saved object [${CASE_SAVED_OBJECT}/${id}] not found`);

/**
 * This class handles ensuring that the user making a request has the correct permissions
 * for the API request.
 */
export class Authorization {
  private readonly request: KibanaRequest;
  private readonly securityAuth: SecurityPluginStart['authz'] | undefined;
  private readonly featureCaseOwners: Set<string>;
  private readonly auditLogger: AuthorizationAuditLogger;
  private readonly profileUid?: string;
  private readonly isSuperuser: boolean;
  private readonly restrictedCasesEnabled: boolean;
  private readonly onRestrictedCaseDenied?: () => void;

  private constructor({
    request,
    securityAuth,
    caseOwners,
    auditLogger,
    profileUid,
    isSuperuser,
    restrictedCasesEnabled,
    onRestrictedCaseDenied,
  }: {
    request: KibanaRequest;
    securityAuth?: SecurityPluginStart['authz'];
    caseOwners: Set<string>;
    auditLogger: AuthorizationAuditLogger;
    profileUid?: string;
    isSuperuser: boolean;
    restrictedCasesEnabled: boolean;
    onRestrictedCaseDenied?: () => void;
  }) {
    this.request = request;
    this.securityAuth = securityAuth;
    this.featureCaseOwners = caseOwners;
    this.auditLogger = auditLogger;
    this.profileUid = profileUid;
    this.isSuperuser = isSuperuser;
    this.restrictedCasesEnabled = restrictedCasesEnabled;
    this.onRestrictedCaseDenied = onRestrictedCaseDenied;
  }

  /**
   * Creates an Authorization object.
   */
  static async create({
    request,
    securityAuth,
    spaces,
    features,
    auditLogger,
    logger,
    profileUid,
    isSuperuser = false,
    restrictedCasesEnabled = false,
    onRestrictedCaseDenied,
  }: {
    request: KibanaRequest;
    securityAuth?: SecurityPluginStart['authz'];
    spaces?: SpacesPluginStart;
    features: FeaturesPluginStart;
    auditLogger: AuthorizationAuditLogger;
    logger: Logger;
    profileUid?: string;
    isSuperuser?: boolean;
    restrictedCasesEnabled?: boolean;
    /** Telemetry hook invoked when a restricted case is refused to a non-assignee. */
    onRestrictedCaseDenied?: () => void;
  }): Promise<Authorization> {
    const getSpace = async (): Promise<Space | undefined> => {
      return spaces?.spacesService.getActiveSpace(request);
    };

    // Since we need to do async operations, this static method handles that before creating the Auth class
    let caseOwners: Set<string>;

    try {
      const maybeSpace = await getSpace();
      const disabledFeatures = new Set(maybeSpace?.disabledFeatures ?? []);

      caseOwners = new Set(
        features
          .getKibanaFeatures()
          // get all the features' cases owners that aren't disabled
          .filter(({ id }) => !disabledFeatures.has(id))
          .flatMap((feature) => feature.cases ?? [])
      );
    } catch (error) {
      throw createCaseError({
        message: `Failed to create Authorization class: ${error}`,
        error,
        logger,
      });
    }

    return new Authorization({
      request,
      securityAuth,
      caseOwners,
      auditLogger,
      profileUid,
      isSuperuser,
      restrictedCasesEnabled,
      onRestrictedCaseDenied,
    });
  }

  private shouldCheckAuthorization(): boolean {
    return this.securityAuth?.mode?.useRbacForRequest(this.request) ?? false;
  }

  /**
   * Restricted-case visibility is enforced only when the feature is enabled
   * and RBAC applies to the request; superusers bypass it entirely.
   */
  private shouldEnforceRestrictedCases(): boolean {
    return this.restrictedCasesEnabled && !this.isSuperuser && this.shouldCheckAuthorization();
  }

  /**
   * Whether the caller holds the reserved superuser role (stateful only).
   * Superusers bypass restricted-case rules such as the last-assignee guard.
   */
  public isSuperuserRequest(): boolean {
    return this.isSuperuser;
  }

  /**
   * Returns true when the caller may see the given case. A restricted case is
   * visible only to its assignees (callers without a user profile are never
   * assignees) and superusers.
   */
  public isCaseVisible({
    access,
    assignees,
  }: {
    access?: CaseAccess;
    assignees?: CaseAssignees;
  }): boolean {
    if (!this.shouldEnforceRestrictedCases() || access?.mode !== CaseAccessMode.RESTRICTED) {
      return true;
    }

    if (this.profileUid == null) {
      return false;
    }

    return (assignees ?? []).some(({ uid }) => uid === this.profileUid);
  }

  /**
   * Checks that the user making the request for the passed in owner, saved object, and operation has the correct authorization. This
   * function will throw if the user is not authorized for the requested operation and owners.
   *
   * @param entities an array of entities describing the case owners in conjunction with the saved object ID attempting
   *  to be authorized
   * @param operation information describing the operation attempting to be authorized
   */
  public async ensureAuthorized({
    entities,
    operation,
  }: {
    entities: OwnerEntity[];
    operation: OperationDetails | OperationDetails[];
  }) {
    const uniqueOwners = Array.from(new Set(entities.map((entity) => entity.owner)));
    const operations = Array.isArray(operation) ? operation : [operation];
    try {
      await this._ensureAuthorized(uniqueOwners, operations);
    } catch (error) {
      this.logSavedObjects({ entities, operation: operations, error });
      throw error;
    }

    // The privilege check passed; now refuse restricted cases the caller may
    // not see. The audit log records the real reason, the caller gets a plain
    // not-found so the case's existence is not revealed.
    const invisibleEntity = entities.find((entity) => !this.isCaseVisible(entity));
    if (invisibleEntity !== undefined) {
      this.logSavedObjects({
        entities: [invisibleEntity],
        operation: operations,
        error: new RestrictedCaseAccessError(),
      });
      this.onRestrictedCaseDenied?.();
      throw createRestrictedCaseNotFoundError(invisibleEntity.id);
    }

    this.logSavedObjects({ entities, operation: operations });
  }

  /**
   *
   * Returns all authorized entities for an operation. It throws error if the user is not authorized
   * to any of the owners
   *
   * @param savedObjects an array of saved objects to be authorized. Each saved objects should contain
   * an ID and an owner
   * @param operation the operation that should be authorized
   */
  public async getAndEnsureAuthorizedEntities<T extends { owner: string }>({
    savedObjects,
    operation,
  }: {
    savedObjects: Array<SavedObject<T>>;
    operation: OperationDetails;
  }): Promise<{ authorized: Array<SavedObject<T>>; unauthorized: Array<SavedObject<T>> }> {
    const entities = savedObjects.map((so) => ({
      id: so.id,
      owner: so.attributes.owner,
    }));

    const { authorizedOwners } = await this.getAuthorizedOwners([operation]);

    if (!authorizedOwners.length) {
      const error = Boom.forbidden(
        AuthorizationAuditLogger.createFailureMessage({
          owners: [],
          operation,
        })
      );

      this.logSavedObjects({ entities, error, operation });

      throw error;
    }

    const { authorized, unauthorized } = groupByAuthorization(savedObjects, authorizedOwners);

    await this.ensureAuthorized({
      operation,
      entities: authorized.map((so) => ({
        owner: so.attributes.owner,
        id: so.id,
      })),
    });

    return { authorized, unauthorized };
  }

  private logSavedObjects({
    entities,
    operation,
    error,
  }: {
    entities: OwnerEntity[];
    operation: OperationDetails | OperationDetails[];
    error?: Error;
  }) {
    const operations = Array.isArray(operation) ? operation : [operation];

    for (const entity of entities) {
      for (const op of operations) {
        this.auditLogger.log({ operation: op, error, entity });
      }
    }
  }

  /**
   * Returns an object to filter the saved object find request to the authorized owners of an entity.
   */
  public async getAuthorizationFilter(operation: OperationDetails): Promise<AuthFilterHelpers> {
    try {
      return await this._getAuthorizationFilter(operation);
    } catch (error) {
      this.auditLogger.log({ error, operation });
      throw error;
    }
  }

  private async _ensureAuthorized(owners: string[], operations: OperationDetails[]) {
    const { securityAuth } = this;
    const areAllOwnersAvailable = owners.every((owner) => this.featureCaseOwners.has(owner));
    if (securityAuth && this.shouldCheckAuthorization()) {
      const requiredPrivileges: string[] = operations.flatMap((operation) =>
        owners.map((owner) => securityAuth.actions.cases.get(owner, operation.name))
      );
      const checkPrivileges = securityAuth.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested } = await checkPrivileges({
        kibana: requiredPrivileges,
      });

      if (!areAllOwnersAvailable) {
        /**
         * Under most circumstances this would have been caught by `checkPrivileges` as
         * a user can't have Privileges to an unknown owner, but super users
         * don't actually get "privilege checked" so the made up owner *will* return
         * as Privileged.
         * This check will ensure we don't accidentally let these through
         */
        throw Boom.forbidden(
          AuthorizationAuditLogger.createFailureMessage({ owners, operation: operations })
        );
      }

      if (!hasAllRequested) {
        throw Boom.forbidden(
          AuthorizationAuditLogger.createFailureMessage({ owners, operation: operations })
        );
      }
    } else if (!areAllOwnersAvailable) {
      throw Boom.forbidden(
        AuthorizationAuditLogger.createFailureMessage({ owners, operation: operations })
      );
    }

    // else security is disabled so let the operation proceed
  }

  private async _getAuthorizationFilter(operation: OperationDetails): Promise<AuthFilterHelpers> {
    const { securityAuth } = this;
    if (securityAuth && this.shouldCheckAuthorization()) {
      const { authorizedOwners } = await this.getAuthorizedOwners([operation]);

      if (!authorizedOwners.length) {
        throw Boom.forbidden(
          AuthorizationAuditLogger.createFailureMessage({ owners: authorizedOwners, operation })
        );
      }

      const ownersFilter = getOwnersFilter(operation.savedObjectType, authorizedOwners);
      const filter =
        operation.savedObjectType === CASE_SAVED_OBJECT && this.shouldEnforceRestrictedCases()
          ? combineFilterWithAuthorizationFilter(getCaseAccessFilter(this.profileUid), ownersFilter)
          : ownersFilter;

      return {
        filter,
        authorizedOwners,
        ensureSavedObjectsAreAuthorized: (entities: OwnerEntity[]) => {
          for (const entity of entities) {
            if (!authorizedOwners.includes(entity.owner)) {
              const error = Boom.forbidden(
                AuthorizationAuditLogger.createFailureMessage({
                  operation,
                  owners: [entity.owner],
                })
              );
              this.auditLogger.log({ error, operation, entity });
              throw error;
            }

            this.auditLogger.log({ operation, entity });
          }
        },
      };
    }

    return {
      ensureSavedObjectsAreAuthorized: (entities: OwnerEntity[]) => {},
    };
  }

  private async getAuthorizedOwners(operations: OperationDetails[]): Promise<{
    username?: string;
    hasAllRequested: boolean;
    authorizedOwners: string[];
  }> {
    const { securityAuth, featureCaseOwners } = this;
    if (securityAuth && this.shouldCheckAuthorization()) {
      const checkPrivileges = securityAuth.checkPrivilegesDynamicallyWithRequest(this.request);
      const requiredPrivileges = new Map<string, string>();

      for (const owner of featureCaseOwners) {
        for (const operation of operations) {
          requiredPrivileges.set(securityAuth.actions.cases.get(owner, operation.name), owner);
        }
      }

      const { hasAllRequested, username, privileges } = await checkPrivileges({
        kibana: [...requiredPrivileges.keys()],
      });
      return {
        hasAllRequested,
        username,
        authorizedOwners: hasAllRequested
          ? Array.from(featureCaseOwners)
          : privileges.kibana.reduce<string[]>((authorizedOwners, { authorized, privilege }) => {
              if (authorized && requiredPrivileges.has(privilege)) {
                const owner = requiredPrivileges.get(privilege);
                if (owner) {
                  authorizedOwners.push(owner);
                }
              }

              return authorizedOwners;
            }, []),
      };
    } else {
      return {
        hasAllRequested: true,
        authorizedOwners: Array.from(featureCaseOwners),
      };
    }
  }
}
