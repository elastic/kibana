/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';
import { wrapCustomError } from '../../../../../server/lib/create_router/error_wrappers';
import { APP_PERMISSIONS } from '../../../common/constants';
import { Plugins } from '../../../shim';

let xpackMainPlugin: any;

export function registerAppRoutes(router: Router, plugins: Plugins) {
  xpackMainPlugin = plugins.xpack_main;
  router.get('permissions', getPermissionsHandler);
}

export function getXpackMainPlugin() {
  return xpackMainPlugin;
}

export const getPermissionsHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const xpackInfo = getXpackMainPlugin() && getXpackMainPlugin().info;
  if (!xpackInfo) {
    // xpackInfo is updated via poll, so it may not be available until polling has begun.
    // In this rare situation, tell the client the service is temporarily unavailable.
    throw wrapCustomError(new Error('Security info unavailable'), 503);
  }

  const securityInfo = xpackInfo && xpackInfo.isAvailable() && xpackInfo.feature('security');
  if (!securityInfo || !securityInfo.isAvailable() || !securityInfo.isEnabled()) {
    // If security isn't enabled, let the user use app.
    return {
      hasPermission: true,
      missingClusterPrivileges: [],
    };
  }

  const { has_all_requested: hasPermission, cluster } = await callWithRequest('transport.request', {
    path: '/_security/user/_has_privileges',
    method: 'POST',
    body: {
      cluster: APP_PERMISSIONS,
    },
  });

  const missingClusterPrivileges = Object.keys(cluster).reduce(
    (permissions: string[], permissionName: string): string[] => {
      if (!cluster[permissionName]) {
        permissions.push(permissionName);
      }
      return permissions;
    },
    []
  );

  return {
    hasPermission,
    missingClusterPrivileges,
  };
};
