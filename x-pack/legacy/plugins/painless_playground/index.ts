/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { resolve } from 'path';
import { PLUGIN_ID, ADVANCED_SETTINGS_FLAG_NAME } from './common/constants';

import { registerLicenseChecker } from './server/register_license_checker';
import { registerExecuteRoute } from './server/register_execute_route';
import { Legacy } from '../../../../kibana';

export const painlessPlayground = (kibana: any) =>
  new kibana.Plugin({
    id: PLUGIN_ID,
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
    init: (server: Legacy.Server) => {
      // Register feature flag
      server.newPlatform.setup.core.uiSettings.register({
        [ADVANCED_SETTINGS_FLAG_NAME]: {
          name: i18n.translate('xpack.painless_playground.devTools.painlessPlaygroundTitle', {
            defaultMessage: 'Painless Playground',
          }),
          description: i18n.translate(
            'xpack.painless_playground.devTools.painlessPlaygroundDescription',
            {
              defaultMessage: 'Enable experimental Painless Playground.',
            }
          ),
          value: false,
          category: ['Dev Tools'],
        },
      });

      registerLicenseChecker(server);
      registerExecuteRoute(server);
    },
  });
