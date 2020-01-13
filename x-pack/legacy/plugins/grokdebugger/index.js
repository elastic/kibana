/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { PLUGIN } from './common/constants';
import { registerGrokdebuggerRoutes } from './server/routes/api/grokdebugger';
import { registerLicenseChecker } from './server/lib/register_license_checker';

export const grokdebugger = kibana =>
  new kibana.Plugin({
    id: PLUGIN.ID,
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.grokdebugger',
    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },
    uiExports: {
      devTools: ['plugins/grokdebugger/register'],
      home: ['plugins/grokdebugger/register_feature'],
    },
    init: server => {
      registerLicenseChecker(server);
      registerGrokdebuggerRoutes(server);
    },
  });
