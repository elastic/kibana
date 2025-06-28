/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthorizationTypeMap,
  ISavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-server';
import type { AuthorizeObject } from '@kbn/core-saved-objects-server/src/extensions/security';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';

const CREATE_ACTIONS = ['create', 'bulkCreate'];
const UPDATE_ACTIONS = ['update', 'bulkUpdate'];

export class AccessControlService {
  private userForOperation: AuthenticatedUser | null = null;

  constructor() {}

  setUserForOperation(user: AuthenticatedUser | null) {
    this.userForOperation = user;
  }

  /**
   * Checks if the operation is allowed based on object-level permissions
   */
  async checkObjectPermissions<A extends string>({
    objects,
    typeRegistry,
    hasManageAccessControlPrivileges,
    typeMap,
  }: {
    objects: AuthorizeObject[];
    typeMap: AuthorizationTypeMap<A>;
    typeRegistry: ISavedObjectTypeRegistry;
    hasManageAccessControlPrivileges: boolean;
  }): Promise<{
    authorizedObjects: AuthorizeObject[];
    unauthorizedObjects: AuthorizeObject[];
    errors: Map<string, Error>; // Maps object IDs to specific errors
  }> {
    const currentUser = this.userForOperation;
    const result = {
      authorizedObjects: [] as AuthorizeObject[],
      unauthorizedObjects: [] as AuthorizeObject[],
      errors: new Map<string, A>(),
    };

    for (const object of objects) {
      const objectId = `${object.type}:${object.id}`;
      const supportsAccessControl = typeRegistry.supportsAccessControl(object.type);
      const accessControl = object.accessControl;
      const isOwner = accessControl?.owner === currentUser?.profile_uid;
      const isAdmin = hasManageAccessControlPrivileges;
      const action = typeMap.get(object.type);
      if (!action) {
        result.unauthorizedObjects.push(object);
        result.errors.set(
          objectId,
          new Error(`Cannot perform action on object of type "${object.type}". Action not defined.`)
        );
        continue;
      }
      // Rule 1: Anyone can create a read-only object
      if (Object.keys(action).some((key) => CREATE_ACTIONS.includes(key))) {
        result.authorizedObjects.push(object);
        continue;
      }

      // Skip access control checks for types that don't support it or objects without access control
      if (!supportsAccessControl || !accessControl) {
        result.authorizedObjects.push(object);
        continue;
      }

      // Rule 2: Only the owner can update a read-only object
      if (
        Object.keys(action).some((key) => UPDATE_ACTIONS.includes(key)) &&
        accessControl.accessMode === 'read_only' &&
        !isOwner &&
        !isAdmin
      ) {
        result.unauthorizedObjects.push(object);
        result.errors.set(objectId, action);
        continue;
      }

      // Rule 3: Admin users also need object to be marked as editable first
      if (
        Object.keys(action).some((key) => UPDATE_ACTIONS.includes(key)) &&
        accessControl.accessMode === 'read_only' &&
        !isOwner &&
        isAdmin
      ) {
        result.unauthorizedObjects.push(object);
        result.errors.set(
          objectId,
          new Error(`Object must be marked as editable before it can be updated, even by admins.`)
        );
        continue;
      }

      if (isOwner || isAdmin) {
        result.authorizedObjects.push(object);
      } else {
        result.unauthorizedObjects.push(object);
        result.errors.set(
          objectId,
          new Error(`Only the owner or an administrator can change ownership or access mode.`)
        );
      }

      result.authorizedObjects.push(object);
    }

    return result;
  }
}
