/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { initAuthenticateApi } from './server/routes/api/v1/authenticate';
import { initUsersApi } from './server/routes/api/v1/users';
import { initApiKeysApi } from './server/routes/api/v1/api_keys';
import { initIndicesApi } from './server/routes/api/v1/indices';
import { initOverwrittenSessionView } from './server/routes/views/overwritten_session';
import { initLoginView } from './server/routes/views/login';
import { initLogoutView } from './server/routes/views/logout';
import { initLoggedOutView } from './server/routes/views/logged_out';
import { AuditLogger } from '../../server/lib/audit_logger';
import { watchStatusAndLicenseToInitialize } from '../../server/lib/watch_status_and_license_to_initialize';
import { KibanaRequest } from '../../../../src/core/server';
import { createCSPRuleString } from '../../../../src/legacy/server/csp';

export const security = (kibana) => new kibana.Plugin({
  id: 'security',
  configPrefix: 'xpack.security',
  publicDir: resolve(__dirname, 'public'),
  require: ['kibana', 'elasticsearch', 'xpack_main'],

  config(Joi) {
    return Joi.object({
      enabled: Joi.boolean().default(true),
      cookieName: Joi.any().description('This key is handled in the new platform security plugin ONLY'),
      encryptionKey: Joi.any().description('This key is handled in the new platform security plugin ONLY'),
      session: Joi.object({
        idleTimeout: Joi.any().description('This key is handled in the new platform security plugin ONLY'),
        lifespan: Joi.any().description('This key is handled in the new platform security plugin ONLY'),
      }).default(),
      secureCookies: Joi.any().description('This key is handled in the new platform security plugin ONLY'),
      loginAssistanceMessage: Joi.string().default(),
      authorization: Joi.object({
        legacyFallback: Joi.object({
          enabled: Joi.boolean().default(true) // deprecated
        }).default()
      }).default(),
      audit: Joi.object({
        enabled: Joi.boolean().default(false)
      }).default(),
      authc: Joi.any().description('This key is handled in the new platform security plugin ONLY')
    }).default();
  },

  deprecations: function ({ rename, unused }) {
    return [
      unused('authorization.legacyFallback.enabled'),
      rename('sessionTimeout', 'session.idleTimeout'),
    ];
  },

  uiExports: {
    chromeNavControls: ['plugins/security/views/nav_control'],
    managementSections: ['plugins/security/views/management'],
    styleSheetPaths: resolve(__dirname, 'public/index.scss'),
    apps: [{
      id: 'login',
      title: 'Login',
      main: 'plugins/security/views/login',
      hidden: true,
    }, {
      id: 'overwritten_session',
      title: 'Overwritten Session',
      main: 'plugins/security/views/overwritten_session',
      description: 'The view is shown when user had an active session previously, but logged in as a different user.',
      hidden: true,
    }, {
      id: 'logout',
      title: 'Logout',
      main: 'plugins/security/views/logout',
      hidden: true
    }, {
      id: 'logged_out',
      title: 'Logged out',
      main: 'plugins/security/views/logged_out',
      hidden: true
    }],
    hacks: [
      'plugins/security/hacks/on_session_timeout',
      'plugins/security/hacks/on_unauthorized_response'
    ],
    home: ['plugins/security/register_feature'],
    injectDefaultVars: (server) => {
      const securityPlugin = server.newPlatform.setup.plugins.security;
      if (!securityPlugin) {
        throw new Error('New Platform XPack Security plugin is not available.');
      }

      return {
        secureCookies: securityPlugin.__legacyCompat.config.secureCookies,
        session: {
          tenant: server.newPlatform.setup.core.http.basePath.serverBasePath,
          idleTimeout: securityPlugin.__legacyCompat.config.session.idleTimeout,
          lifespan: securityPlugin.__legacyCompat.config.session.lifespan,
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
      if (securityPlugin.__legacyCompat.license.getFeatures().allowRbac) {
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
      savedObjects: server.savedObjects,
      auditLogger: new AuditLogger(server, 'security', config, xpackInfo),
      isSystemAPIRequest: server.plugins.kibana.systemApi.isSystemApiRequest.bind(
        server.plugins.kibana.systemApi
      ),
      capabilities: { registerCapabilitiesModifier: server.registerCapabilitiesModifier },
      cspRules: createCSPRuleString(config.get('csp.rules')),
      kibanaIndexName: config.get('kibana.index'),
    });

    // Legacy xPack Info endpoint returns whatever we return in a callback for `registerLicenseCheckResultsGenerator`
    // and the result is consumed by the legacy plugins all over the place, so we should keep it here for now. We assume
    // that when legacy callback is called license has been already propagated to the new platform security plugin and
    // features are up to date.
    xpackInfo.feature(this.id).registerLicenseCheckResultsGenerator(
      () => securityPlugin.__legacyCompat.license.getFeatures()
    );

    server.expose({ getUser: request => securityPlugin.authc.getCurrentUser(KibanaRequest.from(request)) });

    initAuthenticateApi(securityPlugin, server);
    initUsersApi(securityPlugin, server);
    initApiKeysApi(server);
    initIndicesApi(server);
    initLoginView(securityPlugin, server);
    initLogoutView(server);
    initLoggedOutView(securityPlugin, server);
    initOverwrittenSessionView(server);

    server.injectUiAppVars('login', () => {
      const { showLogin, allowLogin, layout = 'form' } = securityPlugin.__legacyCompat.license.getFeatures();
      const { loginAssistanceMessage } = securityPlugin.__legacyCompat.config;
      return {
        loginAssistanceMessage,
        loginState: {
          showLogin,
          allowLogin,
          layout,
        }
      };
    });
  }
});
