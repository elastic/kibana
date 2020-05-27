/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Root } from 'joi';
import { resolve } from 'path';
import { Server } from 'src/legacy/server/kbn_server';
import { KibanaRequest, LegacyRequest } from '../../../../src/core/server';
// @ts-ignore
import { watchStatusAndLicenseToInitialize } from '../../server/lib/watch_status_and_license_to_initialize';
import { AuthenticatedUser, SecurityPluginSetup } from '../../../plugins/security/server';

/**
 * Public interface of the security plugin.
 */
export interface SecurityPlugin {
  getUser: (request: LegacyRequest) => Promise<AuthenticatedUser>;
}

function getSecurityPluginSetup(server: Server) {
  const securityPlugin = server.newPlatform.setup.plugins.security as SecurityPluginSetup;
  if (!securityPlugin) {
    throw new Error('Kibana Platform Security plugin is not available.');
  }

  return securityPlugin;
}

export const security = (kibana: Record<string, any>) =>
  new kibana.Plugin({
    id: 'security',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'xpack_main'],
    configPrefix: 'xpack.security',
    uiExports: {
      hacks: ['plugins/security/hacks/legacy'],
      injectDefaultVars: (server: Server) => {
        return { enableSpaceAwarePrivileges: server.config().get('xpack.spaces.enabled') };
      },
    },

    config(Joi: Root) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      })
        .unknown()
        .default();
    },

    async postInit(server: Server) {
      watchStatusAndLicenseToInitialize(server.plugins.xpack_main, this, async () => {
        const xpackInfo = server.plugins.xpack_main.info;
        if (xpackInfo.isAvailable() && xpackInfo.feature('security').isEnabled()) {
          await getSecurityPluginSetup(server).__legacyCompat.registerPrivilegesWithCluster();
        }
      });
    },

    async init(server: Server) {
      const securityPlugin = getSecurityPluginSetup(server);

      server.expose({
        getUser: async (request: LegacyRequest) =>
          securityPlugin.authc.getCurrentUser(KibanaRequest.from(request)),
      });
    },
  });
