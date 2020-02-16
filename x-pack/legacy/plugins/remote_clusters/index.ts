/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { PLUGIN } from './common';

export function remoteClusters(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    configPrefix: 'xpack.remote_clusters',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana'],
    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
    },
    // TODO: Remove once CCR has migrated to NP
    config(Joi: any) {
      return Joi.object({
        // display menu item
        ui: Joi.object({
          enabled: Joi.boolean().default(true),
        }).default(),

        // enable plugin
        enabled: Joi.boolean().default(true),
      }).default();
    },
    isEnabled(config: any) {
      return (
        config.get('xpack.remote_clusters.enabled') && config.get('xpack.index_management.enabled')
      );
    },
    init() {},
  });
}
