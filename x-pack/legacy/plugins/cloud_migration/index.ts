/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { resolve } from 'path';

import { PLUGIN } from './common/constants';
import { plugin as initServerPlugin } from './server';
import { createShim } from './server/shim';

export function cloudMigration(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    configPrefix: 'xpack.cloud_migration',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/app/index.scss'),
      managementSections: ['plugins/cloud_migration'],
    },
    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(false),
      }).default();
    },
    isEnabled(config: any) {
      return config.get('xpack.cloud_migration.enabled');
    },
    init(server: Legacy.Server) {
      const { core, plugins } = createShim(server);
      const serverPlugin = initServerPlugin();
      serverPlugin.start(core, plugins);
    },
  });
}
