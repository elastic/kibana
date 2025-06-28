/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { AuthorizeObject } from '@kbn/core-saved-objects-server/src/extensions/security';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';

import type { SecurityAction } from './saved_objects_security_extension';

export type AccessControlOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'changeOwner'
  | 'changeAccessMode';

export class AccessControlService {
  private userForOperation: AuthenticatedUser | null = null;

  constructor() {}

  setUserForOperation(user: AuthenticatedUser | null) {
    this.userForOperation = user;
  }

  canModifyObject({
    object,
    typeSupportsAccessControl,
    hasManageOwnershipPrivilege,
  }: {
    type: string;
    object: AuthorizeObject;
    hasManageOwnershipPrivilege?: boolean;
    typeSupportsAccessControl?: boolean;
  }): boolean {
    const accessControl = object.accessControl;
    const currentUser = this.userForOperation;

    if (typeSupportsAccessControl && !currentUser) {
      return false;
    }

    if (!typeSupportsAccessControl || !accessControl) {
      return true;
    }

    if (accessControl.accessMode !== 'read_only') {
      return true;
    }

    if (accessControl.owner === currentUser?.profile_uid) {
      return true;
    }

    if (hasManageOwnershipPrivilege) {
      return true;
    }

    return false;
  }

  /**
   * Checks if the operation is allowed based on object-level permissions
   */
  async checkObjectPermissions({
    objects,
    action,
    operation,
    typeRegistry,
    hasManagePrivilegeCheck,
  }: {
    objects: AuthorizeObject[];
    action: SecurityAction;
    operation: AccessControlOperation;
    typeRegistry: ISavedObjectTypeRegistry;
    hasManagePrivilegeCheck: (type: string) => Promise<boolean>;
  }): Promise<{
    authorizedObjects: AuthorizeObject[];
    unauthorizedObjects: AuthorizeObject[];
    errors: Map<string, Error>; // Maps object IDs to specific errors
  }> {
    const currentUser = this.userForOperation;
    const result = {
      authorizedObjects: [] as AuthorizeObject[],
      unauthorizedObjects: [] as AuthorizeObject[],
      errors: new Map<string, Error>(),
    };

    for (const object of objects) {
      const objectId = `${object.type}:${object.id}`;
      const supportsAccessControl = typeRegistry.supportsAccessControl(object.type);
      const accessControl = object.accessControl;
      const isOwner = accessControl?.owner === currentUser?.profile_uid;
      const isAdmin = await hasManagePrivilegeCheck(object.type);

      // Rule 1: Anyone can create a read-only object
      if (operation === 'create') {
        result.authorizedObjects.push(object);
        continue;
      }

      // Skip access control checks for types that don't support it or objects without access control
      if (!supportsAccessControl || !accessControl) {
        result.authorizedObjects.push(object);
        continue;
      }

      // Rule 2: Only the owner can update a read-only object
      if (operation === 'update' && accessControl.accessMode === 'read_only' && !isOwner) {
        result.unauthorizedObjects.push(object);
        result.errors.set(
          objectId,
          new Error(`Cannot update read-only object. Only the owner can modify this object.`)
        );
        continue;
      }

      // Rule 3: Admin users also need object to be marked as editable first
      if (
        operation === 'update' &&
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

      // Rule 4: Ownership/accessMode changes - only by owner or admin
      if (operation === 'changeOwner' || operation === 'changeAccessMode') {
        if (isOwner || isAdmin) {
          result.authorizedObjects.push(object);
        } else {
          result.unauthorizedObjects.push(object);
          result.errors.set(
            objectId,
            new Error(`Only the owner or an administrator can change ownership or access mode.`)
          );
        }
        continue;
      }

      // Default: authorized
      result.authorizedObjects.push(object);
    }

    return result;
  }
}
