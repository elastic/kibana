/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { registerLicenseChecker } from './server/lib/register_license_checker';
import { PLUGIN } from '../../../plugins/logstash/common/constants';

export const logstash = kibana =>
  new kibana.Plugin({
    id: PLUGIN.ID,
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    configPrefix: 'xpack.logstash',
    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },
    uiExports: {
      managementSections: [
        'plugins/logstash/sections/pipeline_list',
        'plugins/logstash/sections/pipeline_edit',
      ],
      home: ['plugins/logstash/lib/register_home_feature'],
    },
    init: server => {
      registerLicenseChecker(server);
    },
  });
