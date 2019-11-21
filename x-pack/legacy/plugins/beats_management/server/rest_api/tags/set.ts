/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { get } from 'lodash';
import { REQUIRED_LICENSES } from '../../../common/constants';
import { BeatTag } from '../../../common/domain_types';
import { ReturnTypeUpsert } from '../../../common/return_types';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';

// TODO: write to Kibana audit log file
export const createSetTagRoute = (libs: CMServerLibs) => ({
  method: 'PUT',
  path: '/api/beats/tag/{tagId}',
  licenseRequired: REQUIRED_LICENSES,
  requiredRoles: ['beats_admin'],
  config: {
    validate: {
      params: Joi.object({
        tagId: Joi.string(),
      }),
      payload: Joi.object({
        color: Joi.string(),
        name: Joi.string(),
      }),
    },
  },
  handler: async (request: FrameworkRequest): Promise<ReturnTypeUpsert<BeatTag>> => {
    const defaultConfig = {
      id: request.params.tagId,
      name: request.params.tagId,
      color: '#DD0A73',
      hasConfigurationBlocksTypes: [],
    };
    const config = { ...defaultConfig, ...get(request, 'payload', {}) };

    const id = await libs.tags.upsertTag(request.user, config);
    const tag = await libs.tags.getWithIds(request.user, [id]);

    // TODO the action needs to be surfaced
    return { success: true, item: tag[0], action: 'created' };
  },
});
