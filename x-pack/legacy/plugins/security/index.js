/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { get, has } from 'lodash';
import { initAuthenticateApi } from './server/routes/api/v1/authenticate';
import { initUsersApi } from './server/routes/api/v1/users';
import { initApiKeysApi } from './server/routes/api/v1/api_keys';
import { initExternalRolesApi } from './server/routes/api/external/roles';
import { initPrivilegesApi } from './server/routes/api/external/privileges';
import { initIndicesApi } from './server/routes/api/v1/indices';
import { initGetBuiltinPrivilegesApi } from './server/routes/api/v1/builtin_privileges';
import { initOverwrittenSessionView } from './server/routes/views/overwritten_session';
import { initLoginView } from './server/routes/views/login';
import { initLogoutView } from './server/routes/views/logout';
import { initLoggedOutView } from './server/routes/views/logged_out';
import { checkLicense } from './server/lib/check_license';
import { SecurityAuditLogger } from './server/lib/audit_logger';
import { AuditLogger } from '../../server/lib/audit_logger';
import {
  createAuthorizationService,
  disableUICapabilitesFactory,
  initAPIAuthorization,
  initAppAuthorization,
  registerPrivilegesWithCluster,
  validateFeaturePrivileges,
} from './server/lib/authorization';
import { watchStatusAndLicenseToInitialize } from '../../server/lib/watch_status_and_license_to_initialize';
import { SecureSavedObjectsClientWrapper } from './server/lib/saved_objects_client/secure_saved_objects_client_wrapper';
import { deepFreeze } from './server/lib/deep_freeze';
import { createOptionalPlugin } from '../../server/lib/optional_plugin';
import { KibanaRequest } from '../../../../src/core/server';
import { createCSPRuleString } from '../../../../src/legacy/server/csp';

export const security = kibana =>
  new kibana.Plugin({
    id: 'security',
    configPrefix: 'xpack.security',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        cookieName: Joi.any().description(
          'This key is handled in the new platform security plugin ONLY'
        ),
        encryptionKey: Joi.any().description(
          'This key is handled in the new platform security plugin ONLY'
        ),
        sessionTimeout: Joi.any().description(
          'This key is handled in the new platform security plugin ONLY'
        ),
        secureCookies: Joi.any().description(
          'This key is handled in the new platform security plugin ONLY'
        ),
        public: Joi.any().description(
          'This key is handled in the new platform security plugin ONLY'
        ),
        authorization: Joi.object({
          legacyFallback: Joi.object({
            enabled: Joi.boolean().default(true), // deprecated
          }).default(),
        }).default(),
        audit: Joi.object({
          enabled: Joi.boolean().default(false),
        }).default(),
        authc: Joi.any().description(
          'This key is handled in the new platform security plugin ONLY'
        ),
      }).default();
    },

    deprecations: function({ unused, rename }) {
      return [
        unused('authorization.legacyFallback.enabled'),
        rename('authProviders', 'authc.providers'),
        (settings, log) => {
          const hasSAMLProvider = get(settings, 'authc.providers', []).includes('saml');
          if (hasSAMLProvider && !get(settings, 'authc.saml.realm')) {
            log(
              'Config key "authc.saml.realm" will become mandatory when using the SAML authentication provider in the next major version.'
            );
          }

          if (has(settings, 'public')) {
            log(
              'Config key "public" is deprecated and will be removed in the next major version. ' +
                'Specify "authc.saml.realm" instead.'
            );
          }
        },
      ];
    },

    uiExports: {
      chromeNavControls: ['plugins/security/views/nav_control'],
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
      ],
      home: ['plugins/security/register_feature'],
      injectDefaultVars: server => {
        const securityPlugin = server.newPlatform.setup.plugins.security;
        if (!securityPlugin) {
          throw new Error('New Platform XPack Security plugin is not available.');
        }

        return {
          secureCookies: securityPlugin.config.secureCookies,
          sessionTimeout: securityPlugin.config.sessionTimeout,
          enableSpaceAwarePrivileges: server.config().get('xpack.spaces.enabled'),
        };
      },
    },

    async postInit(server) {
      const plugin = this;

      const xpackMainPlugin = server.plugins.xpack_main;

      watchStatusAndLicenseToInitialize(xpackMainPlugin, plugin, async license => {
        if (license.allowRbac) {
          const { security } = server.plugins;
          await validateFeaturePrivileges(
            security.authorization.actions,
            xpackMainPlugin.getFeatures()
          );
          await registerPrivilegesWithCluster(server);
        }
      });
    },

    async init(server) {
      const securityPlugin = server.newPlatform.setup.plugins.security;
      if (!securityPlugin) {
        throw new Error('New Platform XPack Security plugin is not available.');
      }

      const config = server.config();
      const xpackMainPlugin = server.plugins.xpack_main;
      const xpackInfo = xpackMainPlugin.info;
      securityPlugin.registerLegacyAPI({
        xpackInfo,
        serverConfig: {
          protocol: server.info.protocol,
          hostname: config.get('server.host'),
          port: config.get('server.port'),
        },
        isSystemAPIRequest: server.plugins.kibana.systemApi.isSystemApiRequest.bind(
          server.plugins.kibana.systemApi
        ),
        cspRules: createCSPRuleString(config.get('csp.rules')),
      });

      const plugin = this;
      const xpackInfoFeature = xpackInfo.feature(plugin.id);

      // Register a function that is called whenever the xpack info changes,
      // to re-compute the license check results for this plugin
      xpackInfoFeature.registerLicenseCheckResultsGenerator(checkLicense);

      server.expose({
        getUser: request => securityPlugin.authc.getCurrentUser(KibanaRequest.from(request)),
      });

      const { savedObjects } = server;

      const spaces = createOptionalPlugin(config, 'xpack.spaces', server.plugins, 'spaces');

      // exposes server.plugins.security.authorization
      const authorization = createAuthorizationService(
        server,
        xpackInfoFeature,
        xpackMainPlugin,
        spaces
      );
      server.expose('authorization', deepFreeze(authorization));

      const auditLogger = new SecurityAuditLogger(
        new AuditLogger(server, 'security', server.config(), xpackInfo)
      );

      savedObjects.setScopedSavedObjectsClientFactory(({ request }) => {
        const adminCluster = server.plugins.elasticsearch.getCluster('admin');
        const { callWithRequest, callWithInternalUser } = adminCluster;
        const callCluster = (...args) => callWithRequest(request, ...args);

        if (authorization.mode.useRbacForRequest(request)) {
          const internalRepository = savedObjects.getSavedObjectsRepository(callWithInternalUser);
          return new savedObjects.SavedObjectsClient(internalRepository);
        }

        const callWithRequestRepository = savedObjects.getSavedObjectsRepository(callCluster);
        return new savedObjects.SavedObjectsClient(callWithRequestRepository);
      });

      savedObjects.addScopedSavedObjectsClientWrapperFactory(
        Number.MAX_SAFE_INTEGER - 1,
        'security',
        ({ client, request }) => {
          if (authorization.mode.useRbacForRequest(request)) {
            return new SecureSavedObjectsClientWrapper({
              actions: authorization.actions,
              auditLogger,
              baseClient: client,
              checkSavedObjectsPrivilegesWithRequest:
                authorization.checkSavedObjectsPrivilegesWithRequest,
              errors: savedObjects.SavedObjectsClient.errors,
              request,
              savedObjectTypes: savedObjects.types,
            });
          }

          return client;
        }
      );

      initAuthenticateApi(securityPlugin, server);
      initAPIAuthorization(server, authorization);
      initAppAuthorization(server, xpackMainPlugin, authorization);
      initUsersApi(securityPlugin, server);
      initApiKeysApi(server);
      initExternalRolesApi(server);
      initIndicesApi(server);
      initPrivilegesApi(server);
      initGetBuiltinPrivilegesApi(server);
      initLoginView(securityPlugin, server, xpackMainPlugin);
      initLogoutView(server);
      initLoggedOutView(securityPlugin, server);
      initOverwrittenSessionView(server);

      server.injectUiAppVars('login', () => {
        const { showLogin, loginMessage, allowLogin, layout = 'form' } =
          xpackInfo.feature(plugin.id).getLicenseCheckResults() || {};

        return {
          loginState: {
            showLogin,
            allowLogin,
            loginMessage,
            layout,
          },
        };
      });

      server.registerCapabilitiesModifier((request, uiCapabilities) => {
        // if we have a license which doesn't enable security, or we're a legacy user
        // we shouldn't disable any ui capabilities
        const { authorization } = server.plugins.security;
        if (!authorization.mode.useRbacForRequest(request)) {
          return uiCapabilities;
        }

        const disableUICapabilites = disableUICapabilitesFactory(server, request);
        // if we're an anonymous route, we disable all ui capabilities
        if (request.route.settings.auth === false) {
          return disableUICapabilites.all(uiCapabilities);
        }

        return disableUICapabilites.usingPrivileges(uiCapabilities);
      });
    },
  });
