/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core/server';
import type {
  AuthorizeObject,
  CheckAuthorizationResult,
} from '@kbn/core-saved-objects-server/src/extensions/security';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';

import type { SavedObjectAudit } from './saved_objects_security_extension';

export class AccessControlService {
  private userForOperation: AuthenticatedUser | null = null;

  constructor() {}

  setUserForOperation(user: AuthenticatedUser | null) {
    this.userForOperation = user;
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

  getTypesRequiringAccessControlPrivilegeCheck<A extends string>({
    objects,
    typeRegistry,
  }: {
    objects: AuthorizeObject[];
    typeRegistry: ISavedObjectTypeRegistry;
  }) {
    const currentUser = this.userForOperation;
    const typesRequiringCheck = new Set<string>();

    for (const obj of objects) {
      if (
        typeRegistry.supportsAccessControl(obj.type) &&
        obj.accessControl?.accessMode === 'read_only' &&
        obj.accessControl?.owner &&
        currentUser &&
        obj.accessControl.owner !== currentUser.profile_uid
      ) {
        typesRequiringCheck.add(obj.type);
      }
    }

    return { typesRequiringAccessControl: typesRequiringCheck };
  }

  enforceAccessControl<A extends string>({
    authorizationResult,
    typesRequiringAccessControl,
  }: {
    authorizationResult: CheckAuthorizationResult<A>;
    typesRequiringAccessControl: Set<string>;
  }) {
    if (authorizationResult.status === 'unauthorized') {
      const typeList = [...typesRequiringAccessControl].sort().join(',');
      throw new Error(`Access denied: Unable to manage access control for ${typeList}`);
    }

    const { typeMap } = authorizationResult;
    const unauthorizedTypes: string[] = [];

    for (const type of typesRequiringAccessControl) {
      const typeAuth = typeMap.get(type);

      // If no authorization entry exists for this type, or no 'manage_access_control' privilege
      if (!typeAuth || !typeAuth['manage_access_control' as A]) {
        unauthorizedTypes.push(type);
      } else {
        const accessControlAuth = typeAuth['manage_access_control' as A];

        // Check if user has global authorization or authorization in at least one space
        if (
          !accessControlAuth.isGloballyAuthorized &&
          (!accessControlAuth.authorizedSpaces || accessControlAuth.authorizedSpaces.length === 0)
        ) {
          unauthorizedTypes.push(type);
        }
      }
    }

    // If we found unauthorized types, throw an error
    if (unauthorizedTypes.length > 0) {
      const typeList = unauthorizedTypes.sort().join(',');
      throw new Error(`Access denied: Unable to manage access control for ${typeList}`);
    }
  }
}
