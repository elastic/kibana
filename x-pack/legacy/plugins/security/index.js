/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { initOverwrittenSessionView } from './server/routes/views/overwritten_session';
import { initLoginView } from './server/routes/views/login';
import { initLogoutView } from './server/routes/views/logout';
import { initLoggedOutView } from './server/routes/views/logged_out';
import { AuditLogger } from '../../server/lib/audit_logger';
import { watchStatusAndLicenseToInitialize } from '../../server/lib/watch_status_and_license_to_initialize';
import { KibanaRequest } from '../../../../src/core/server';

export const security = kibana =>
  new kibana.Plugin({
    id: 'security',
    configPrefix: 'xpack.security',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],

    config(Joi) {
      const HANDLED_IN_NEW_PLATFORM = Joi.any().description(
        'This key is handled in the new platform security plugin ONLY'
      );
      return Joi.object({
        enabled: Joi.boolean().default(true),
        cookieName: HANDLED_IN_NEW_PLATFORM,
        encryptionKey: HANDLED_IN_NEW_PLATFORM,
        session: HANDLED_IN_NEW_PLATFORM,
        secureCookies: HANDLED_IN_NEW_PLATFORM,
        loginAssistanceMessage: HANDLED_IN_NEW_PLATFORM,
        audit: Joi.object({
          enabled: Joi.boolean().default(false),
        }).default(),
        authc: HANDLED_IN_NEW_PLATFORM,
      }).default();
    },

    uiExports: {
      chromeNavControls: [],
      managementSections: ['plugins/security/views/management'],
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      apps: [
        {
          id: 'login',
          title: 'Login',
          main: 'plugins/security/views/login',
          hidden: true,
        },
        {
          id: 'overwritten_session',
          title: 'Overwritten Session',
          main: 'plugins/security/views/overwritten_session',
          description:
            'The view is shown when user had an active session previously, but logged in as a different user.',
          hidden: true,
        },
        {
          id: 'logout',
          title: 'Logout',
          main: 'plugins/security/views/logout',
          hidden: true,
        },
        {
          id: 'logged_out',
          title: 'Logged out',
          main: 'plugins/security/views/logged_out',
          hidden: true,
        },
      ],
      hacks: [
        'plugins/security/hacks/on_session_timeout',
        'plugins/security/hacks/on_unauthorized_response',
        'plugins/security/hacks/register_account_management_app',
      ],
      home: ['plugins/security/register_feature'],
      injectDefaultVars: server => {
        const securityPlugin = server.newPlatform.setup.plugins.security;
        if (!securityPlugin) {
          throw new Error('New Platform XPack Security plugin is not available.');
        }

        return {
          secureCookies: securityPlugin.__legacyCompat.config.secureCookies,
          session: {
            tenant: server.newPlatform.setup.core.http.basePath.serverBasePath,
          },
          enableSpaceAwarePrivileges: server.config().get('xpack.spaces.enabled'),
        };
      },
    },

    async postInit(server) {
      const securityPlugin = server.newPlatform.setup.plugins.security;
      if (!securityPlugin) {
        throw new Error('New Platform XPack Security plugin is not available.');
      }

      watchStatusAndLicenseToInitialize(server.plugins.xpack_main, this, async () => {
        const xpackInfo = server.plugins.xpack_main.info;
        if (xpackInfo.isAvailable() && xpackInfo.feature('security').isEnabled()) {
          await securityPlugin.__legacyCompat.registerPrivilegesWithCluster();
        }
      });
    },

    async init(server) {
      const securityPlugin = server.newPlatform.setup.plugins.security;
      if (!securityPlugin) {
        throw new Error('New Platform XPack Security plugin is not available.');
      }

      const config = server.config();
      const xpackInfo = server.plugins.xpack_main.info;
      securityPlugin.__legacyCompat.registerLegacyAPI({
        auditLogger: new AuditLogger(server, 'security', config, xpackInfo),
        isSystemAPIRequest: server.plugins.kibana.systemApi.isSystemApiRequest.bind(
          server.plugins.kibana.systemApi
        ),
      });

      // Legacy xPack Info endpoint returns whatever we return in a callback for `registerLicenseCheckResultsGenerator`
      // and the result is consumed by the legacy plugins all over the place, so we should keep it here for now. We assume
      // that when legacy callback is called license has been already propagated to the new platform security plugin and
      // features are up to date.
      xpackInfo
        .feature(this.id)
        .registerLicenseCheckResultsGenerator(() =>
          securityPlugin.__legacyCompat.license.getFeatures()
        );

      server.expose({
        getUser: request => securityPlugin.authc.getCurrentUser(KibanaRequest.from(request)),
      });

      initLoginView(securityPlugin, server);
      initLogoutView(server);
      initLoggedOutView(securityPlugin, server);
      initOverwrittenSessionView(server);

      server.injectUiAppVars('login', () => {
        const {
          showLogin,
          allowLogin,
          layout = 'form',
        } = securityPlugin.__legacyCompat.license.getFeatures();
        const { loginAssistanceMessage } = securityPlugin.__legacyCompat.config;
        return {
          loginAssistanceMessage,
          loginState: {
            showLogin,
            allowLogin,
            layout,
          },
        };
      });
    },
  });
