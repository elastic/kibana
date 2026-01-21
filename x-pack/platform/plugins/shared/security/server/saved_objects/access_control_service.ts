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
const UPDATE_ACTION = 'update';

const buildAccessDeniedMessage = (
  rbacTypes: string[],
  objectsRequiringAccessControl: ObjectRequiringPrivilegeCheckResult[]
): string => {
  const parts: string[] = ['Access denied:'];

  if (rbacTypes.length > 0) {
    const typeList = rbacTypes.join(', ');
    parts.push(
      `Unable to perform manage access control for types ${typeList}. The "update" privilege is required to change access control of objects owned by the current user.`
    );
  }

  if (objectsRequiringAccessControl.length > 0) {
    const objectsRequiringAccessControlString = objectsRequiringAccessControl
      .map((object) => `${object.type}:${object.id}`)
      .join(', ');
    parts.push(
      `Unable to manage access control for objects ${objectsRequiringAccessControlString}: the "manage_access_control" privilege is required to change access control of objects owned by another user.`
    );
  }

  return parts.join(' ');
};

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

    return !currentUser || accessControl.owner !== currentUser.profile_uid;
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
    objectsRequiringPrivilegeCheck,
    currentSpace,
    addAuditEventFn,
  }: {
    authorizationResult: CheckAuthorizationResult<A>;
    objectsRequiringPrivilegeCheck: ObjectRequiringPrivilegeCheckResult[];
    currentSpace: string;
    addAuditEventFn?: (types: string[]) => void;
  }) {
    // Derive typesRequiringAccessControl and typesRequiringRbac from the objects array.
    // - typesRequiringAccessControl: types where objects are NOT owned by current user (need manage_access_control)
    // - typesRequiringRbac: types where objects ARE owned by current user (need update privilege)
    // - objectsRequiringAccessControl: filtered list for error messaging (non-owner objects only)
    const typesRequiringAccessControl = new Set(
      objectsRequiringPrivilegeCheck
        .filter((obj) => obj.requiresManageAccessControl)
        .map((obj) => obj.type)
    );
    const typesRequiringRbac = new Set(
      objectsRequiringPrivilegeCheck
        .filter((obj) => !obj.requiresManageAccessControl)
        .map((obj) => obj.type)
    );
    const objectsRequiringAccessControl = objectsRequiringPrivilegeCheck.filter(
      (obj) => obj.requiresManageAccessControl
    );

    if (authorizationResult.status === 'unauthorized') {
      const rbacTypeList = [...typesRequiringRbac].sort();
      const allTypes = [...new Set([...typesRequiringRbac, ...typesRequiringAccessControl])].sort();
      addAuditEventFn?.(allTypes);
      throw SavedObjectsErrorHelpers.decorateForbiddenError(
        new Error(buildAccessDeniedMessage(rbacTypeList, objectsRequiringAccessControl))
      );
    }

    const { typeMap } = authorizationResult;

    // Track unauthorized types separately to provide context-specific error messages:
    // - unauthorizedAccessControlTypes: non-owner users lacking manage_access_control privilege
    // - unauthorizedRbacTypes: owners who lost space access or RBAC privileges
    const unauthorizedAccessControlTypes: Set<string> = new Set();
    const unauthorizedRbacTypes: Set<string> = new Set();

    /**
     * Checks if a type is unauthorized for the given action and adds it to the target set.
     * A type is considered unauthorized if:
     * - No authorization info exists for the action, OR
     * - User lacks global authorization AND lacks authorization in the current space
     */
    const addUnauthorizedType = (type: string, action: A, targetSet: Set<string>): void => {
      const typeAuth = typeMap.get(type);
      const actionAuth = typeAuth?.[action];
      if (!actionAuth) {
        targetSet.add(type);
      } else {
        // Check if user has global authorization or authorization in the current space
        if (
          !actionAuth.isGloballyAuthorized &&
          (!actionAuth.authorizedSpaces || !actionAuth.authorizedSpaces.includes(currentSpace))
        ) {
          targetSet.add(type);
        }
      }
    };

    // Check manage_access_control privilege for non-owner types
    for (const type of typesRequiringAccessControl) {
      addUnauthorizedType(type, MANAGE_ACCESS_CONTROL_ACTION as A, unauthorizedAccessControlTypes);
    }

    // Check RBAC/space privileges for owner types
    for (const type of typesRequiringRbac) {
      addUnauthorizedType(type, UPDATE_ACTION as A, unauthorizedRbacTypes);
    }

    if (unauthorizedRbacTypes.size > 0 || unauthorizedAccessControlTypes.size > 0) {
      const rbacTypeList = [...unauthorizedRbacTypes].sort();
      const accessControlTypeList = [...unauthorizedAccessControlTypes].sort();
      const allUnauthorizedTypes = [...new Set([...rbacTypeList, ...accessControlTypeList])].sort();
      const unauthorizedObjects = objectsRequiringAccessControl.filter((obj) =>
        unauthorizedAccessControlTypes.has(obj.type)
      );
      addAuditEventFn?.(allUnauthorizedTypes);
      throw SavedObjectsErrorHelpers.decorateForbiddenError(
        new Error(buildAccessDeniedMessage(rbacTypeList, unauthorizedObjects))
      );
    }
  }
}
