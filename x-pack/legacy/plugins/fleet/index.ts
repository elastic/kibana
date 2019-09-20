/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Joi from 'joi';
import { resolve } from 'path';
import { i18n } from '@kbn/i18n';
import { PLUGIN } from './common/constants';
import { CONFIG_PREFIX } from './common/constants/plugin';
import { initServerWithKibana } from './server/kibana.index';
//

export const config = Joi.object({
  enabled: Joi.boolean().default(true),
}).default();

export function fleet(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: 'Elastic Fleet',
        description: i18n.translate('xpack.fleet.elasticFleetDescription', {
          defaultMessage: 'Manage your elastic data ingestion stack',
        }),
        main: 'plugins/fleet/index',
        icon: 'plugins/fleet/icon.svg',
        euiIconType: 'apmApp',
        order: 8000,
      },
    },
    config: () => config,
    configPrefix: CONFIG_PREFIX,
    init(server: any) {
      initServerWithKibana(server);
    },
  });
}
