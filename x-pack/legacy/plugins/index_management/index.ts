/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function indexManagement(kibana: any) {
  return new kibana.Plugin({
    id: 'index_management',
    configPrefix: 'xpack.index_management',
    // TODO: Remove once All dependent apps have migrated to NP
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
        config.get('xpack.index_management.enabled') && config.get('xpack.index_management.enabled')
      );
    },
  });
}
