/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyPluginInitializer } from '../../../../src/legacy/plugin_discovery/types';

export const graph: LegacyPluginInitializer = kibana => {
  return new kibana.Plugin({
    id: 'graph',
    configPrefix: 'xpack.graph',
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        canEditDrillDownUrls: Joi.boolean().default(true),
        savePolicy: Joi.string()
          .valid(['config', 'configAndDataWithConsent', 'configAndData', 'none'])
          .default('configAndData'),
      }).default();
    },
  });
};
