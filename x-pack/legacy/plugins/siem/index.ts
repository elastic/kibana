/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { resolve } from 'path';
import { Root } from 'joi';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { savedObjectMappings } from '../../../plugins/siem/server/saved_objects';

import { APP_ID, APP_NAME } from '../../../plugins/siem/common/constants';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const siem = (kibana: any) => {
  return new kibana.Plugin({
    id: APP_ID,
    configPrefix: 'xpack.siem',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'alerting', 'actions', 'triggers_actions_ui'],
    uiExports: {
      app: {
        description: i18n.translate('xpack.siem.securityDescription', {
          defaultMessage: 'Explore your SIEM App',
        }),
        main: 'plugins/siem/legacy',
        euiIconType: 'securityAnalyticsApp',
        title: APP_NAME,
        listed: false,
        url: `/app/${APP_ID}`,
      },
      home: ['plugins/siem/register_feature'],
      links: [
        {
          description: i18n.translate('xpack.siem.linkSecurityDescription', {
            defaultMessage: 'Explore your SIEM App',
          }),
          euiIconType: 'securityAnalyticsApp',
          id: 'siem',
          order: 9000,
          title: APP_NAME,
          url: `/app/${APP_ID}`,
          category: DEFAULT_APP_CATEGORIES.security,
        },
      ],
      mappings: savedObjectMappings,
    },
    config(Joi: Root) {
      return Joi.object()
        .keys({
          enabled: Joi.boolean().default(true),
        })
        .unknown(true)
        .default();
    },
  });
};
