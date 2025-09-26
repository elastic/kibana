/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectTypeRegistry } from '@kbn/core/server';
import type {
  AccessControlAuthorizeResult,
  AuthorizeObject,
  CheckAuthorizationResult,
  GetTypesRequiringAccessControlCheckResult,
} from '@kbn/core-saved-objects-server/src/extensions/security';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';

import { SecurityAction } from '.';

export const MANAGE_ACCESS_CONTROL_ACTION = 'manage_access_control';

export class AccessControlService {
  private userForOperation: AuthenticatedUser | null = null;

  setUserForOperation(user: AuthenticatedUser | null) {
    this.userForOperation = user;
  }

  getTypesRequiringPrivilegeCheck({
    objects,
    typeRegistry,
    actions,
  }: {
    objects: AuthorizeObject[];
    typeRegistry?: ISavedObjectTypeRegistry;
    actions: Set<SecurityAction>;
  }): GetTypesRequiringAccessControlCheckResult {
    if (!typeRegistry) {
      return { typesRequiringAccessControl: new Set<string>(), results: [] };
    }
    const currentUser = this.userForOperation;
    const typesRequiringAccessControl = new Set<string>();

    // This is all here because our authz functions support multiple actions at once.
    // This is not a real use case, but we need to handle it anyway.
    const actionsIgnoringDefaultMode = [SecurityAction.UPDATE, SecurityAction.BULK_UPDATE];
    const anyActionsForcingDefaultCheck =
      Array.from(actions).filter((item) => !actionsIgnoringDefaultMode.includes(item)).length > 0;

    const results: AccessControlAuthorizeResult[] = objects.map((obj) => {
      let requiresManageAccessControl = false;
      // Alternatively just make two different checks based on anyActionsForcingDefaultCheck just for readability sake
      if (
        // ToDo: This logic behaves strangely if accessControl.mode is undefined, which for some reason it can be?
        // Is this due to the overuse of ts expect error?
        // Shouldn't we only need to check that accessControl is defined?
        typeRegistry.supportsAccessControl(obj.type) &&
        (anyActionsForcingDefaultCheck || obj.accessControl?.accessMode === 'read_only') &&
        obj.accessControl?.owner &&
        currentUser && // Sid - if we don't have a user, should't we ultimately throw?
        obj.accessControl.owner !== currentUser.profile_uid
      ) {
        typesRequiringAccessControl.add(obj.type);
        requiresManageAccessControl = true;
      }
      return {
        type: obj.type,
        id: obj.id,
        ...(obj.name && { name: obj.name }),
        requiresManageAccessControl,
      };
    });

    // ToDo: potentially return an array of which objects specifically require manage access control so we can use that from places like import/export
    // or for surfacing better messages to the user.
    return { typesRequiringAccessControl, results };
  }

  enforceAccessControl<A extends string>({
    authorizationResult,
    typesRequiringAccessControl,
    currentSpace,
  }: {
    authorizationResult: CheckAuthorizationResult<A>;
    typesRequiringAccessControl: Set<string>;
    currentSpace: string;
  }) {
    if (authorizationResult.status === 'unauthorized') {
      const typeList = [...typesRequiringAccessControl].sort().join(',');
      throw new Error(`Access denied: Unable to manage access control for ${typeList}`);
    }

    const { typeMap } = authorizationResult;
    const unauthorizedTypes: Set<string> = new Set();

    for (const type of typesRequiringAccessControl) {
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
      const typeList = [...unauthorizedTypes].sort().join(',');
      throw new Error(`Access denied: Unable to manage access control for ${typeList}`);
    }
  }
}
