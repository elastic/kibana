/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import JoiNamespace from 'joi';
import { resolve } from 'path';

import { getConfigSchema, initServerWithKibana, KbnServer } from './server/kibana.index';
import { savedObjectMappings } from './server/saved_objects';

const APP_ID = 'infra';

export function infra(kibana: any) {
  return new kibana.Plugin({
    id: APP_ID,
    configPrefix: 'xpack.infra',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'metrics'],
    uiExports: {
      app: {
        description: i18n.translate('xpack.infra.infrastructureDescription', {
          defaultMessage: 'Explore your infrastructure',
        }),
        icon: 'plugins/infra/images/infra_mono_white.svg',
        main: 'plugins/infra/app',
        title: i18n.translate('xpack.infra.infrastructureTitle', {
          defaultMessage: 'Infrastructure',
        }),
        listed: false,
        url: `/app/${APP_ID}#/infrastructure`,
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      home: ['plugins/infra/register_feature'],
      links: [
        {
          description: i18n.translate('xpack.infra.linkInfrastructureDescription', {
            defaultMessage: 'Explore your infrastructure',
          }),
          icon: 'plugins/infra/images/infra_mono_white.svg',
          euiIconType: 'infraApp',
          id: 'infra:home',
          order: 8000,
          title: i18n.translate('xpack.infra.linkInfrastructureTitle', {
            defaultMessage: 'Infrastructure',
          }),
          url: `/app/${APP_ID}#/infrastructure`,
        },
        {
          description: i18n.translate('xpack.infra.linkLogsDescription', {
            defaultMessage: 'Explore your logs',
          }),
          icon: 'plugins/infra/images/logging_mono_white.svg',
          euiIconType: 'loggingApp',
          id: 'infra:logs',
          order: 8001,
          title: i18n.translate('xpack.infra.linkLogsTitle', {
            defaultMessage: 'Logs',
          }),
          url: `/app/${APP_ID}#/logs`,
        },
      ],
      mappings: savedObjectMappings,
    },
    config(Joi: typeof JoiNamespace) {
      return getConfigSchema(Joi);
    },
    init(server: KbnServer) {
      initServerWithKibana(server);
    },
  });
}
