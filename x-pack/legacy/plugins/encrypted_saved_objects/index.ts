/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Root } from 'joi';
import { Legacy, Server } from 'kibana';

// @ts-ignore
import { AuditLogger } from '../../server/lib/audit_logger';

import { CONFIG_PREFIX, PLUGIN_ID, Plugin } from './server/plugin';

/**
 * Public interface of the security plugin for the legacy plugin system.
 */
export type EncryptedSavedObjectsPlugin = ReturnType<Plugin['setup']>;

export const encryptedSavedObjects = (kibana: any) =>
  new kibana.Plugin({
    id: PLUGIN_ID,
    configPrefix: CONFIG_PREFIX,
    require: ['kibana', 'elasticsearch', 'xpack_main'],

    config(Joi: Root) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        encryptionKey: Joi.when(Joi.ref('$dist'), {
          is: true,
          then: Joi.string().min(32),
          otherwise: Joi.string()
            .min(32)
            .default('a'.repeat(32)),
        }),
      }).default();
    },

    async init(server: Legacy.Server) {
      const loggerFacade = {
        fatal: (errorOrMessage: string | Error) => server.log(['fatal', PLUGIN_ID], errorOrMessage),
        trace: (message: string) => server.log(['debug', PLUGIN_ID], message),
        error: (message: string) => server.log(['error', PLUGIN_ID], message),
        warn: (message: string) => server.log(['warning', PLUGIN_ID], message),
        debug: (message: string) => server.log(['debug', PLUGIN_ID], message),
        info: (message: string) => server.log(['info', PLUGIN_ID], message),
      } as Server.Logger;

      const config = server.config();
      const encryptedSavedObjectsSetup = new Plugin(loggerFacade).setup(
        {
          config: {
            encryptionKey: config.get<string | undefined>(`${CONFIG_PREFIX}.encryptionKey`),
          },
          savedObjects: server.savedObjects,
          elasticsearch: server.plugins.elasticsearch,
        },
        { audit: new AuditLogger(server, PLUGIN_ID, config, server.plugins.xpack_main.info) }
      );

      // Re-expose plugin setup contract through legacy mechanism.
      for (const [setupMethodName, setupMethod] of Object.entries(encryptedSavedObjectsSetup)) {
        server.expose(setupMethodName, setupMethod);
      }
    },
  });
