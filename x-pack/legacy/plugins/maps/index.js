/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { resolve } from 'path';
import { getAppTitle } from '../../../plugins/maps/common/i18n_getters';
import { APP_ID, APP_ICON } from '../../../plugins/maps/common/constants';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';

export function maps(kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch'],
    id: APP_ID,
    configPrefix: 'xpack.maps',
    publicDir: resolve(__dirname, 'public'),
    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      })
        .unknown()
        .default();
    },
    uiExports: {
      app: {
        title: getAppTitle(),
        description: i18n.translate('xpack.maps.appDescription', {
          defaultMessage: 'Map application',
        }),
        main: 'plugins/maps/legacy',
        icon: 'plugins/maps/icon.svg',
        euiIconType: APP_ICON,
        category: DEFAULT_APP_CATEGORIES.kibana,
        order: 4000,
      },
      styleSheetPaths: `${__dirname}/public/index.scss`,
    },
  });
}
