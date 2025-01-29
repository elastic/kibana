/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AuthenticatedUser, type KibanaRequest, SavedObjectsClient } from '@kbn/core/server';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type {
  AuditServiceSetup,
  AuthorizationServiceSetup,
} from '@kbn/security-plugin-types-server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';

import { SecureSpacesClientWrapper } from './secure_spaces_client_wrapper';
import { SavedObjectsSecurityExtension } from '../saved_objects';

interface Deps {
  audit: AuditServiceSetup;
  authz: AuthorizationServiceSetup;
  spaces?: SpacesPluginSetup;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  getTypeRegistry: () => Promise<ISavedObjectTypeRegistry>;
}

export const setupSpacesClient = ({
  audit,
  authz,
  spaces,
  getCurrentUser,
  getTypeRegistry,
}: Deps) => {
  if (!spaces) {
    return;
  }
  const { spacesClient } = spaces;

  spacesClient.setClientRepositoryFactory((request, savedObjectsStart) => {
    if (authz.mode.useRbacForRequest(request)) {
      return savedObjectsStart.createInternalRepository(['space']);
    }
    return savedObjectsStart.createScopedRepository(request, ['space']);
  });

  spacesClient.registerClientWrapper((request, baseClient) => {
    const securityExtension = authz.mode.useRbacForRequest(request)
      ? new SavedObjectsSecurityExtension({
          actions: authz.actions,
          auditLogger: audit.asScoped(request),
          checkPrivileges: authz.checkSavedObjectsPrivilegesWithRequest(request),
          errors: SavedObjectsClient.errors,
          getCurrentUser: () => getCurrentUser(request),
        })
      : undefined;
    return new SecureSpacesClientWrapper(
      baseClient,
      request,
      authz,
      audit.asScoped(request),
      SavedObjectsClient.errors,
      securityExtension,
      getTypeRegistry
    );
  });
};
