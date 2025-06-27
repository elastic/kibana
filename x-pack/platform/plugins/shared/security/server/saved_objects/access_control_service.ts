/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthorizeObject } from '@kbn/core-saved-objects-server/src/extensions/security';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';

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
}
