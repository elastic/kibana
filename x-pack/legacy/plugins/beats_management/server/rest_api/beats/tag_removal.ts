/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { ReturnTypeBulkAction } from '../../../common/return_types';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';

// TODO: write to Kibana audit log file https://github.com/elastic/kibana/issues/26024
export const createTagRemovalsRoute = (libs: CMServerLibs) => ({
  method: 'POST',
  path: '/api/beats/agents_tags/removals',
  licenseRequired: REQUIRED_LICENSES,
  requiredRoles: ['beats_admin'],
  config: {
    validate: {
      payload: Joi.object({
        removals: Joi.array().items(
          Joi.object({
            beatId: Joi.string().required(),
            tag: Joi.string().required(),
          })
        ),
      }).required(),
    },
  },
  handler: async (request: FrameworkRequest): Promise<ReturnTypeBulkAction> => {
    const { removals } = request.payload;

    const response = await libs.beats.removeTagsFromBeats(request.user, removals);

    return {
      success: true,
      results: response.removals.map(removal => ({
        success: removal.status && removal.status >= 200 && removal.status < 300,
        error:
          !removal.status || removal.status >= 300
            ? {
                code: removal.status || 400,
                message: removal.result,
              }
            : undefined,
        result:
          removal.status && removal.status >= 200 && removal.status < 300
            ? {
                message: removal.result,
              }
            : undefined,
      })),
    } as ReturnTypeBulkAction;
  },
});
