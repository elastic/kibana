/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthorizeObject } from '@kbn/core/packages/saved-objects/server/src/extensions/security';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import type { CheckSavedObjectsPrivileges } from '@kbn/security-plugin-types-server';

export class AccessControlService {
  private getCurrentUserFunc: () => AuthenticatedUser | null;
  private getTypeRegistryFunc: () => Promise<ISavedObjectTypeRegistry>;
  // private isUserAdmin: boolean;
  private readonly checkPrivilegesFunc: CheckSavedObjectsPrivileges;

  constructor({
    getCurrentUser,
    getTypeRegistry,
    checkPrivilegesFunc,
  }: {
    getCurrentUser: () => AuthenticatedUser | null;
    getTypeRegistry: () => Promise<ISavedObjectTypeRegistry>;
    checkPrivilegesFunc: CheckSavedObjectsPrivileges;
  }) {
    this.getCurrentUserFunc = getCurrentUser;
    this.getTypeRegistryFunc = getTypeRegistry;
    this.checkPrivilegesFunc = checkPrivilegesFunc;
  }

  async canModifyAccess(type: string, object: AuthorizeObject): Promise<boolean> {
    // check if type supports access control
    const typeSupportsAccessControl = (await this.getTypeRegistryFunc())?.supportsAccessControl(
      type
    );
    if (!typeSupportsAccessControl) {
      return true; // No access control restrictions for this type
    }

    // Check if object has access control metadata && if access mode is read only
    const accessControl = object?.accessControl;
    if (accessControl?.accessMode !== 'read_only') {
      return true;
    }

    const currentUser = this.getCurrentUserFunc();
    if (!currentUser) {
      return false;
    }

    // Check if user is owner - allow if owner
    if (accessControl?.owner === currentUser.username) {
      return true;
    }

    // Check for the specific privilege
    const { hasAllRequested, privileges } = await this.checkPrivilegesFunc(
      'saved_object/dashboard:manageOwnership',
      []
    );
    console.log({ hasAllRequested, privileges });

    // Check if user has the specific privilege needed to manage ownership
    // Look through kibana privileges to find our specific privilege
    return false;
  }
}
