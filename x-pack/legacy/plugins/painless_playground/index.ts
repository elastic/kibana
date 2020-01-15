/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { PLUGIN } from './common/constants';

import { registerLicenseChecker } from './server/register_license_checker';
import { registerSimulateRoute } from './server/register_simulate_route';

export const painlessPlayground = (kibana: any) =>
  new kibana.Plugin({
    id: PLUGIN.ID,
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.painless_playground',
    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },
    uiExports: {
      devTools: [resolve(__dirname, 'public/register')],
    },
    init: (server: any) => {
      registerLicenseChecker(server);
      registerSimulateRoute(server);
    },
  });
