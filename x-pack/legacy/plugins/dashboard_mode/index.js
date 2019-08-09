/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

import {
  CONFIG_DASHBOARD_ONLY_MODE_ROLES
} from './common';

import {
  createDashboardModeRequestInterceptor,
} from './server';

import { i18n } from '@kbn/i18n';

// Copied largely from plugins/kibana/index.js. The dashboard viewer includes just the dashboard section of
// the standard kibana plugin.  We don't want to include code for the other links (visualize, dev tools, etc)
// since it's view only, but we want the urls to be the same, so we are using largely the same setup.
export function dashboardMode(kibana) {
  const kbnBaseUrl = '/app/kibana';
  return new kibana.Plugin({
    id: 'dashboard_mode',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      uiSettingDefaults: {
        [CONFIG_DASHBOARD_ONLY_MODE_ROLES]: {
          name: i18n.translate('xpack.dashboardMode.uiSettings.dashboardsOnlyRolesTitle', {
            defaultMessage: 'Dashboards only roles'
          }),
          description: i18n.translate('xpack.dashboardMode.uiSettings.dashboardsOnlyRolesDescription', {
            defaultMessage: 'Roles that belong to View Dashboards Only mode'
          }),
          value: ['kibana_dashboard_only_user'],
          category: ['dashboard'],
        }
      },
      app: {
        id: 'dashboardViewer',
        title: i18n.translate('xpack.dashboardMode.dashboardViewerTitle', {
          defaultMessage: 'Dashboard Viewer'
        }),
        listed: false,
        hidden: true,
        description: i18n.translate('xpack.dashboardMode.dashboardViewerDescription', {
          defaultMessage: 'view dashboards'
        }),
        main: 'plugins/dashboard_mode/dashboard_viewer',
        links: [
          {
            id: 'kibana:dashboard',
            title: i18n.translate('xpack.dashboardMode.dashboardViewer.dashboardTitle', {
              defaultMessage: 'Dashboard'
            }),
            order: -1001,
            url: `${kbnBaseUrl}#/dashboards`,
            subUrlBase: `${kbnBaseUrl}#/dashboard`,
            description: i18n.translate('xpack.dashboardMode.dashboardViewer.dashboardDescription', {
              defaultMessage: 'Dashboard Viewer'
            }),
            icon: 'plugins/kibana/assets/dashboard.svg',
          }
        ],
      },
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true)
      }).default();
    },

    init(server) {
      server.injectUiAppVars('dashboardViewer', async () => (
        await server.getInjectedUiAppVars('kibana')
      ));

      if (server.plugins.security) {
        // extend the server to intercept requests
        const dashboardViewerApp = server.getHiddenUiAppById('dashboardViewer');
        server.ext(createDashboardModeRequestInterceptor(dashboardViewerApp));
      }
    }
  });
}
