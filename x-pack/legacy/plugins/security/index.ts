/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Root } from 'joi';
import { resolve } from 'path';
import { Server } from 'src/legacy/server/kbn_server';
// @ts-ignore
import { AuditLogger } from '../../server/lib/audit_logger';
import { SecurityPluginSetup } from '../../../plugins/security/server';

export const security = (kibana: Record<string, any>) =>
  new kibana.Plugin({
    id: 'security',
    configPrefix: 'xpack.security',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],

    // This config is only used by `AuditLogger` and should be removed as soon as `AuditLogger`
    // is migrated to Kibana Platform.
    config(Joi: Root) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        audit: Joi.object({ enabled: Joi.boolean().default(false) }).default(),
      })
        .unknown()
        .default();
    },

    uiExports: { hacks: ['plugins/security/hacks/legacy'] },

    async init(server: Server) {
      const securityPlugin = server.newPlatform.setup.plugins.security as SecurityPluginSetup;
      if (!securityPlugin) {
        throw new Error('Kibana Platform Security plugin is not available.');
      }

      const xpackInfo = server.plugins.xpack_main.info;
      securityPlugin.__legacyCompat.registerLegacyAPI({
        auditLogger: new AuditLogger(server, 'security', server.config(), xpackInfo),
      });

      // Legacy xPack Info endpoint returns whatever we return in a callback for `registerLicenseCheckResultsGenerator`
      // and the result is consumed by the legacy plugins all over the place, so we should keep it here for now. We assume
      // that when legacy callback is called license has been already propagated to the new platform security plugin and
      // features are up to date.
      xpackInfo
        .feature(this.id)
        .registerLicenseCheckResultsGenerator(() => securityPlugin.license.getFeatures());
    },
  });
