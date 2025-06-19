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
  private getTypeRegistryFunc: () => Promise<ISavedObjectTypeRegistry>;
  // private isUserAdmin: boolean;
  private readonly checkPrivilegesFunc: CheckSavedObjectsPrivileges;
  private userForOperation: AuthenticatedUser | null = null;

  constructor({
    getTypeRegistry,
    checkPrivilegesFunc,
  }: {
    getTypeRegistry: () => Promise<ISavedObjectTypeRegistry>;
    checkPrivilegesFunc: CheckSavedObjectsPrivileges;
  }) {
    this.getTypeRegistryFunc = getTypeRegistry;
    this.checkPrivilegesFunc = checkPrivilegesFunc;
  }

  setUserForOperation(user: AuthenticatedUser | null) {
    this.userForOperation = user;
  }

  async canModifyObject({
    type,
    object,
    spacesToAuthorize,
  }: {
    type: string;
    object: AuthorizeObject;
    spacesToAuthorize: Set<string>;
  }): Promise<boolean> {
    const typeSupportsAccessControl = (await this.getTypeRegistryFunc())?.supportsAccessControl(
      type
    );

    const accessControl = object?.accessControl;
    const currentUser = this.userForOperation;

    if (!typeSupportsAccessControl || !accessControl || !currentUser) {
      return true;
    }

    if (accessControl.accessMode !== 'read_only') {
      return true;
    }

    if (accessControl.owner === currentUser.username) {
      return true;
    }

    const { hasAllRequested } = await this.checkPrivilegesFunc(
      `saved_object/${type}:manageOwnership`,
      [...spacesToAuthorize]
    );
    if (hasAllRequested) {
      return true;
    }

    return false;
  }
}
