/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { CONFIG_DASHBOARD_ONLY_MODE_ROLES } from '../common';

const superuserRole = 'superuser';

/**
 *  Intercept all requests after auth has completed and apply filtering
 *  logic to enforce dashboard only mode.
 *
 *  @type {Hapi.RequestExtension}
 */
export function createDashboardModeRequestInterceptor() {
  return {
    type: 'onPostAuth',
    async method(request, h) {
      const { auth, url } = request;
      const user = auth.credentials;
      const roles = user ? user.roles : [];

      if (!user) {
        return h.continue;
      }

      const isAppRequest = url.path.startsWith('/app/');

      // The act of retrieving this setting ends up creating the config document if it doesn't already exist.
      // Various functional tests have come to indirectly rely on this behavior, so changing this is non-trivial.
      // This will be addressed once dashboard-only-mode is removed altogether.
      const uiSettings = request.getUiSettingsService();
      const dashboardOnlyModeRoles = await uiSettings.get(CONFIG_DASHBOARD_ONLY_MODE_ROLES);

      if (!isAppRequest || !dashboardOnlyModeRoles || !roles || roles.length === 0) {
        return h.continue;
      }

      const isDashboardOnlyModeUser = user.roles.find((role) =>
        dashboardOnlyModeRoles.includes(role)
      );
      const isSuperUser = user.roles.find((role) => role === superuserRole);

      const enforceDashboardOnlyMode = isDashboardOnlyModeUser && !isSuperUser;
      if (enforceDashboardOnlyMode) {
        if (
          url.path.startsWith('/app/home') ||
          url.path.startsWith('/app/kibana') ||
          url.path.startsWith('/app/dashboards')
        ) {
          const basePath = request.server.newPlatform.setup.core.http.basePath.get(request);
          const url = `${basePath}/app/dashboard_mode`;
          // If the user is in "Dashboard only mode" they should only be allowed to see
          // the dashboard app and none others. If the kibana app is requested, this might be a old
          // url we will migrate on the fly.
          return h.redirect(url).permanent().takeover();
        }
        if (url.path.startsWith('/app/dashboard_mode')) {
          // let through requests to the dashboard_mode app
          return h.continue;
        }

        throw Boom.notFound();
      }

      return h.continue;
    },
  };
}
