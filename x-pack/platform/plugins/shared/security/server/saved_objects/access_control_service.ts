/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { AuthorizeObject } from '@kbn/core-saved-objects-server/src/extensions/security';
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

  async canModifyAccess({
    type,
    object,
  }: {
    type: string;
    object?: AuthorizeObject | null;
  }): Promise<boolean> {
    // check if type supports access control
    const typeSupportsAccessControl = (await this.getTypeRegistryFunc())?.supportsAccessControl(
      type
    );
    const accessControl = object?.accessControl;
    const currentUser = this.getCurrentUserFunc();
    if (!typeSupportsAccessControl || !accessControl || !currentUser) {
      return true;
    }

    if (accessControl.accessMode !== 'read_only') {
      return true;
    }

    // Check if user is owner - allow if owner
    if (accessControl.owner === currentUser.username) {
      return true;
    }

    // Check for the specific privilege
    const { hasAllRequested } = await this.checkPrivilegesFunc(
      'saved_object/dashboard:manageOwnership',
      []
    );
    if (hasAllRequested) {
      return true;
    }

    return false;
  }
}
