/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';
import { wrapCustomError } from '../../../../../server/lib/create_router/error_wrappers';
import {
  APP_REQUIRED_CLUSTER_PRIVILAGES,
  APP_RESTORE_INDEX_PRIVILAGES,
} from '../../../common/constants';
import { AppPermissions } from '../../../common/types';
import { Plugins } from '../../../shim';

let xpackMainPlugin: any;

export function registerAppRoutes(router: Router, plugins: Plugins) {
  xpackMainPlugin = plugins.xpack_main;
  router.get('permissions', getPermissionsHandler);
}

export function getXpackMainPlugin() {
  return xpackMainPlugin;
}

const extractMissingPrivileges = (privilegesObject: { [key: string]: boolean }): string[] => {
  return Object.keys(privilegesObject).reduce(
    (privileges: string[], privilegeName: string): string[] => {
      if (!privilegesObject[privilegeName]) {
        privileges.push(privilegeName);
      }
      return privileges;
    },
    []
  );
};

export const getPermissionsHandler: RouterRouteHandler = async (
  req,
  callWithRequest
): Promise<AppPermissions> => {
  const xpackInfo = getXpackMainPlugin() && getXpackMainPlugin().info;
  if (!xpackInfo) {
    // xpackInfo is updated via poll, so it may not be available until polling has begun.
    // In this rare situation, tell the client the service is temporarily unavailable.
    throw wrapCustomError(new Error('Security info unavailable'), 503);
  }

  const permissionsResult: AppPermissions = {
    hasPermission: true,
    missingClusterPrivileges: [],
    missingIndexPrivileges: [],
  };

  const securityInfo = xpackInfo && xpackInfo.isAvailable() && xpackInfo.feature('security');
  if (!securityInfo || !securityInfo.isAvailable() || !securityInfo.isEnabled()) {
    // If security isn't enabled, let the user use app.
    return permissionsResult;
  }

  // Get cluster priviliges
  const { has_all_requested: hasPermission, cluster } = await callWithRequest('transport.request', {
    path: '/_security/user/_has_privileges',
    method: 'POST',
    body: {
      cluster: APP_REQUIRED_CLUSTER_PRIVILAGES,
    },
  });

  // Find missing cluster privileges and set overall app permissions
  permissionsResult.missingClusterPrivileges = extractMissingPrivileges(cluster || {});
  permissionsResult.hasPermission = hasPermission;

  // Get all index privileges the user has
  const { indices } = await callWithRequest('transport.request', {
    path: '/_security/user/_privileges',
    method: 'GET',
  });

  // Check if they have at the required index privilages for at least one index
  const oneIndexWithAllPrivileges = indices.find(({ privileges }: { privileges: string[] }) => {
    return (
      privileges.includes('all') ||
      APP_RESTORE_INDEX_PRIVILAGES.filter(privilage => !privileges.includes(privilage)).length === 0
    );
  });

  // If they don't, return list of required index privilages
  if (!oneIndexWithAllPrivileges) {
    permissionsResult.missingIndexPrivileges = [...APP_RESTORE_INDEX_PRIVILAGES];
  }

  return permissionsResult;
};
