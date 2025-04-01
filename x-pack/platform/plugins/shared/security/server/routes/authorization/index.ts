/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrivilegesRoutes } from './privileges';
import { resetSessionPageRoutes } from './reset_session_page';
import { defineRolesRoutes } from './roles';
import { defineShareSavedObjectPermissionRoutes } from './spaces';
import type { RouteDefinitionParams } from '..';

export function defineAuthorizationRoutes(params: RouteDefinitionParams) {
  // The reset session endpoint is registered with httpResources and should remain public in serverless
  resetSessionPageRoutes(params);

  // By default, in the serverless environment privileges and permissions are managed internally and only
  // exposed to users and administrators via control plane UI, however, we will allow these routes to be registered
  // behind a feature flag for development & design of Custom Roles
  if (params.buildFlavor !== 'serverless' || params.config.roleManagementEnabled) {
    definePrivilegesRoutes(params);
    defineRolesRoutes(params);
  }

  // Shared object permission routes are not currently available in serverless.
  if (params.buildFlavor !== 'serverless') {
    defineShareSavedObjectPermissionRoutes(params);
  }
}
