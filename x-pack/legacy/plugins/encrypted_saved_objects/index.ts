/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Root } from 'joi';
import { Legacy } from 'kibana';
import { PluginSetupContract } from '../../../plugins/encrypted_saved_objects/server';
// @ts-ignore
import { AuditLogger } from '../../server/lib/audit_logger';

export const encryptedSavedObjects = (kibana: {
  Plugin: new (options: Legacy.PluginSpecOptions & { configPrefix?: string }) => unknown;
}) =>
  new kibana.Plugin({
    id: 'encryptedSavedObjects',
    configPrefix: 'xpack.encryptedSavedObjects',
    require: ['xpack_main'],

    // Some legacy plugins still use `enabled` config key, so we keep it here, but the rest of the
    // keys is handled by the New Platform plugin.
    config: (Joi: Root) =>
      Joi.object({ enabled: Joi.boolean().default(true) })
        .unknown(true)
        .default(),

    init(server: Legacy.Server) {
      const encryptedSavedObjectsPlugin = (server.newPlatform.setup.plugins
        .encryptedSavedObjects as unknown) as PluginSetupContract;
      if (!encryptedSavedObjectsPlugin) {
        throw new Error('New Platform XPack EncryptedSavedObjects plugin is not available.');
      }

      encryptedSavedObjectsPlugin.__legacyCompat.registerLegacyAPI({
        auditLogger: new AuditLogger(
          server,
          'encryptedSavedObjects',
          server.config(),
          server.plugins.xpack_main.info
        ),
      });
    },
  });
