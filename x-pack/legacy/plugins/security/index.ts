/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Root } from 'joi';
import { resolve } from 'path';
import { Server } from 'src/legacy/server/kbn_server';
import { SecurityPluginSetup } from '../../../plugins/security/server';

export const security = (kibana: Record<string, any>) =>
  new kibana.Plugin({
    id: 'security',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'xpack_main'],
    configPrefix: 'xpack.security',
    uiExports: { hacks: ['plugins/security/hacks/legacy'] },
    config: (Joi: Root) =>
      Joi.object({ enabled: Joi.boolean().default(true) })
        .unknown()
        .default(),
    init() {},
  });
