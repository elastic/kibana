/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { resolve } from 'path';
import { PLUGIN } from './common/constants';
import { CONFIG_PREFIX } from './common/constants/plugin';
import { initServerWithKibana } from './server/kibana.index';
import { KibanaLegacyServer } from './server/lib/adapters/framework/adapter_types';

const DEFAULT_ENROLLMENT_TOKENS_TTL_S = 10 * 60; // 10 minutes

export const config = Joi.object({
  enabled: Joi.boolean().default(true),
  defaultUserRoles: Joi.array()
    .items(Joi.string())
    .default(['superuser']),
  encryptionKey: Joi.string().default('xpack_beats_default_encryptionKey'),
  enrollmentTokensTtlInSeconds: Joi.number()
    .integer()
    .min(1)
    .max(10 * 60 * 14) // No more then 2 weeks for security reasons
    .default(DEFAULT_ENROLLMENT_TOKENS_TTL_S),
}).default();

export function beats(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN.ID,
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      managementSections: ['plugins/beats_management'],
    },
    config: () => config,
    configPrefix: CONFIG_PREFIX,
    init(server: KibanaLegacyServer) {
      initServerWithKibana(server);
    },
  });
}
