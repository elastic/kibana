/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, CoreSetup, KibanaRequest } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';

import { getImportTransformsFactory } from './access_control_transforms';
import { SavedObjectsSecurityExtension } from './saved_objects_security_extension';
import type { AclService } from '../access_control/acl_service';
import { createScopedAuditLogger } from '../access_control/audit';
import { SavedObjectsAclExtension } from '../access_control/saved_objects_acl_extension';
import type { AuthorizationServiceSetupInternal } from '../authorization';

export { SecurityAction } from './types';

interface SetupSavedObjectsParams {
  audit: AuditServiceSetup;
  authz: Pick<
    AuthorizationServiceSetupInternal,
    'mode' | 'actions' | 'checkSavedObjectsPrivilegesWithRequest'
  >;
  savedObjects: CoreSetup['savedObjects'];
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  /** Whether platform object-level security is enforced. */
  accessControlEnabled: boolean;
  /** The object-level security service, available after start. */
  getAclService: () => AclService;
}

export function setupSavedObjects({
  audit,
  authz,
  savedObjects,
  getCurrentUser,
  accessControlEnabled,
  getAclService,
}: SetupSavedObjectsParams) {
  savedObjects.setClientFactoryProvider(
    // This is not used by Kibana itself, but it can be leveraged for Kibana to use a third-party authentication header if there is a custom
    // authentication layer sitting between Kibana and Elasticsearch, and if Elasticsearch security is disabled. It's unclear if it's even
    // possible for that to function anymore, perhaps we should deprecate this custom client factory provider and remove it in 9.0?
    (repositoryFactory) =>
      ({ request, includedHiddenTypes, extensions }) => {
        return new SavedObjectsClient(
          authz.mode.useRbacForRequest(request)
            ? repositoryFactory.createInternalRepository(
                includedHiddenTypes,
                extensions,
                request.serverTiming
              )
            : repositoryFactory.createScopedRepository(request, includedHiddenTypes, extensions)
        );
      }
  );

  savedObjects.setSecurityExtension(({ request, typeRegistry }) => {
    return authz.mode.useRbacForRequest(request)
      ? new SavedObjectsSecurityExtension({
          actions: authz.actions,
          // Within a repository operation, events about objects that object-level security hides are
          // dropped when the operation ends, so a hidden object is logged only as an access denial.
          auditLogger: createScopedAuditLogger(audit.asScoped(request)),
          checkPrivileges: authz.checkSavedObjectsPrivilegesWithRequest(request),
          errors: SavedObjectsClient.errors,
          getCurrentUser: () => getCurrentUser(request),
          typeRegistry,
          primeRecovery: accessControlEnabled
            ? (type, spaceIds, granted) =>
                getAclService().asScoped(request).primeRecovery(type, spaceIds, granted)
            : undefined,
        })
      : undefined;
  });

  savedObjects.setAclExtension(({ request }) => {
    // Without RBAC for the request, object-level security cannot be enforced by Security, and Core
    // falls back to an extension that fails closed. Deliberately disabled enforcement is different:
    // the service then allows every object while Core keeps preserving stored ACLs.
    if (accessControlEnabled && !authz.mode.useRbacForRequest(request)) {
      return undefined;
    }
    return new SavedObjectsAclExtension(getAclService().asScoped(request));
  });

  savedObjects.setAccessControlTransforms({
    createImportTransforms: getImportTransformsFactory(),
  });
}

export { SavedObjectsSecurityExtension };
