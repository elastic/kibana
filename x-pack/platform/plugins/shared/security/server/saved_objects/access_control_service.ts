/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type {
  AuthorizeObject,
  CheckAuthorizationResult,
  GetObjectsRequiringPrivilegeCheckResult,
  ObjectRequiringPrivilegeCheckResult,
} from '@kbn/core-saved-objects-server/src/extensions/security';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';

import { SecurityAction } from '.';

export const MANAGE_ACCESS_CONTROL_ACTION = 'manage_access_control';

interface AccessControlServiceParams {
  typeRegistry?: ISavedObjectTypeRegistry;
}

export class AccessControlService {
  private userForOperation: AuthenticatedUser | null = null;
  private typeRegistry: ISavedObjectTypeRegistry | undefined;

  constructor({ typeRegistry }: AccessControlServiceParams) {
    this.typeRegistry = typeRegistry;
  }

  setUserForOperation(user: AuthenticatedUser | null) {
    this.userForOperation = user;
  }

  shouldObjectRequireAccessControl(params: {
    object: AuthorizeObject;
    currentUser: AuthenticatedUser | null;
    actions: Set<SecurityAction>;
  }) {
    const { object, currentUser, actions } = params;

    if (!this.typeRegistry?.supportsAccessControl(object.type)) {
      return false;
    }

    const { accessControl } = object;
    if (!accessControl) {
      return false;
    }

    // Note: We will ultimately have to check privileges even if there is no
    // current user because we will need to support actions via HTTP APIs,
    // like import
    if (!accessControl.owner || !currentUser) {
      return false;
    }

    const actionsIgnoringDefaultMode = new Set([
      SecurityAction.CREATE,
      SecurityAction.BULK_CREATE,
      SecurityAction.UPDATE,
      SecurityAction.BULK_UPDATE,
      SecurityAction.DELETE,
      SecurityAction.BULK_DELETE,
    ]);

    const anyActionsForcingDefaultCheck = Array.from(actions).some(
      (item) => !actionsIgnoringDefaultMode.has(item)
    );

    if (!anyActionsForcingDefaultCheck && accessControl.accessMode === 'default') {
      return false;
    }

    return accessControl.owner !== currentUser.profile_uid;
  }

  getObjectsRequiringPrivilegeCheck({
    objects,
    actions,
  }: {
    objects: AuthorizeObject[];
    actions: Set<SecurityAction>;
  }): GetObjectsRequiringPrivilegeCheckResult {
    if (!this.typeRegistry) {
      return { types: new Set<string>(), objects: [] };
    }
    const currentUser = this.userForOperation;
    const typesRequiringAccessControl = new Set<string>();

    const results: ObjectRequiringPrivilegeCheckResult[] = objects.map((object) => {
      const requiresManageAccessControl = this.shouldObjectRequireAccessControl({
        object,
        currentUser,
        actions,
      });

      if (requiresManageAccessControl) {
        typesRequiringAccessControl.add(object.type);
      }

      return {
        type: object.type,
        id: object.id,
        ...(object.name && { name: object.name }),
        requiresManageAccessControl,
      };
    });

    return { types: typesRequiringAccessControl, objects: results };
  }

  enforceAccessControl<A extends string>({
    authorizationResult,
    typesRequiringAccessControl,
    currentSpace,
    addAuditEventFn,
  }: {
    authorizationResult: CheckAuthorizationResult<A>;
    typesRequiringAccessControl: Set<string>;
    currentSpace: string;
    addAuditEventFn?: (types: string[]) => void;
  }) {
    if (authorizationResult.status === 'unauthorized') {
      const typeList = [...typesRequiringAccessControl].sort();
      addAuditEventFn?.(typeList);
      throw SavedObjectsErrorHelpers.decorateForbiddenError(
        new Error(`Access denied: Unable to manage access control for ${typeList}`)
      );
    }

    const { typeMap } = authorizationResult;
    const unauthorizedTypes: Set<string> = new Set();

    for (const type of typesRequiringAccessControl) {
      if (!this.typeRegistry?.supportsAccessControl(type)) {
        continue;
      }
      const typeAuth = typeMap.get(type);
      const accessControlAuth = typeAuth?.[MANAGE_ACCESS_CONTROL_ACTION as A];
      if (!accessControlAuth) {
        unauthorizedTypes.add(type);
      } else {
        // Check if user has global authorization or authorization in at least one space
        if (
          !accessControlAuth.isGloballyAuthorized &&
          (!accessControlAuth.authorizedSpaces ||
            !accessControlAuth.authorizedSpaces.includes(currentSpace))
        ) {
          unauthorizedTypes.add(type);
        }
      }
    }
    // If we found unauthorized types, throw an error
    if (unauthorizedTypes.size > 0) {
      const typeList = [...unauthorizedTypes].sort();
      addAuditEventFn?.(typeList);
      throw SavedObjectsErrorHelpers.decorateForbiddenError(
        new Error(`Access denied: Unable to manage access control for ${typeList}`)
      );
    }
  }
}
