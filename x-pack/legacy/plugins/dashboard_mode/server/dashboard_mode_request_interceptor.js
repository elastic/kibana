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
export function createDashboardModeRequestInterceptor(dashboardViewerApp) {
  if (!dashboardViewerApp) {
    throw new TypeError('Expected to receive a `dashboardViewerApp` argument');
  }

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

      const isDashboardOnlyModeUser = user.roles.find(role =>
        dashboardOnlyModeRoles.includes(role)
      );
      const isSuperUser = user.roles.find(role => role === superuserRole);

      const enforceDashboardOnlyMode = isDashboardOnlyModeUser && !isSuperUser;
      if (enforceDashboardOnlyMode) {
        if (url.path.startsWith('/app/kibana')) {
          // If the user is in "Dashboard only mode" they should only be allowed to see
          // that app and none others.  Here we are intercepting all other routing and ensuring the viewer
          // app is the only one ever rendered.
          const response = await h.renderApp(dashboardViewerApp);
          return response.takeover();
        }

        throw Boom.notFound();
      }

      return h.continue;
    },
  };
}
