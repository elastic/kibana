/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthorizeObject } from '@kbn/core-saved-objects-server/src/extensions/security';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import { SavedObjectAudit } from './saved_objects_security_extension';

export class AccessControlService {
  private userForOperation: AuthenticatedUser | null = null;

  constructor() {}

  setUserForOperation(user: AuthenticatedUser | null) {
    this.userForOperation = user;
  }

  async checkObjectLevelPermissions<A extends string>({
    object,
    typeSupportsAccessControl,
    hasManageAccessControlPrivilege,
  }: {
    object: AuthorizeObject;
    typeSupportsAccessControl: boolean;
    hasManageAccessControlPrivilege: boolean;
  }): Promise<boolean> {
    const { accessControl } = object;
    const currentUser = this.userForOperation;

    // If the object does not have access control, we don't need to check permissions

    if (!currentUser) {
      return false;
    }

    if (!typeSupportsAccessControl) {
      return true;
    }

    if (accessControl?.accessMode !== 'read_only') {
      return true;
    }

    const isOwner = accessControl?.owner === currentUser?.profile_uid;

    // If the object is not owned by the user, they need admin privileges
    if (isOwner === false && hasManageAccessControlPrivilege === false) {
      return false;
    }

    return true;
  }

  isObjectOwner(object: SavedObjectAudit): boolean {
    const currentUser = this.userForOperation;

    if (!currentUser) {
      return false;
    }

    if (!object.accessControl) {
      return true;
    }

    return object.accessControl.owner === currentUser.profile_uid;
  }
}
