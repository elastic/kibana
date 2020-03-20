/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH } from '../../../../common/constants';
// @ts-ignore
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
// @ts-ignore
import { deserializeAutoFollowStats } from '../../lib/ccr_stats_serialization';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';

import { mapErrorToKibanaHttpResponse } from '../map_to_kibana_http_error';
import { RouteDependencies } from '../types';

export const registerCcrRoutes = ({ router, __LEGACY }: RouteDependencies) => {
  /**
   * Returns Auto-follow stats
   */
  router.get(
    {
      path: `${API_BASE_PATH}/stats/auto_follow`,
      validate: false,
    },
    licensePreRoutingFactory({
      __LEGACY,
      requestHandler: async (ctx, request, response) => {
        const callWithRequest = callWithRequestFactory(__LEGACY.server, request);

        try {
          const { auto_follow_stats: autoFollowStats } = await callWithRequest('ccr.stats');

          return response.ok({
            body: deserializeAutoFollowStats(autoFollowStats),
          });
        } catch (err) {
          return mapErrorToKibanaHttpResponse(err);
        }
      },
    })
  );

  /**
   * Returns whether the user has CCR permissions
   */
  router.get(
    {
      path: `${API_BASE_PATH}/permissions`,
      validate: false,
    },
    licensePreRoutingFactory({
      __LEGACY,
      requestHandler: async (ctx, request, response) => {
        const xpackMainPlugin = __LEGACY.server.plugins.xpack_main;
        const xpackInfo = xpackMainPlugin && xpackMainPlugin.info;

        if (!xpackInfo) {
          // xpackInfo is updated via poll, so it may not be available until polling has begun.
          // In this rare situation, tell the client the service is temporarily unavailable.
          return response.customError({
            statusCode: 503,
            body: 'Security info unavailable',
          });
        }

        const securityInfo = xpackInfo && xpackInfo.isAvailable() && xpackInfo.feature('security');
        if (!securityInfo || !securityInfo.isAvailable() || !securityInfo.isEnabled()) {
          // If security isn't enabled or available (in the case where security is enabled but license reverted to Basic) let the user use CCR.
          return response.ok({
            body: {
              hasPermission: true,
              missingClusterPrivileges: [],
            },
          });
        }

        const callWithRequest = callWithRequestFactory(__LEGACY.server, request);

        try {
          const { has_all_requested: hasPermission, cluster } = await callWithRequest(
            'ccr.permissions',
            {
              body: {
                cluster: ['manage', 'manage_ccr'],
              },
            }
          );

          const missingClusterPrivileges = Object.keys(cluster).reduce(
            (permissions: any, permissionName: any) => {
              if (!cluster[permissionName]) {
                permissions.push(permissionName);
                return permissions;
              }
            },
            [] as any[]
          );

          return response.ok({
            body: {
              hasPermission,
              missingClusterPrivileges,
            },
          });
        } catch (err) {
          return mapErrorToKibanaHttpResponse(err);
        }
      },
    })
  );
};
