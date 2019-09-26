/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { get } from 'lodash';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { BaseReturnType, ReturnTypeBulkCreate } from '../../../common/return_types';
import { FrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { CMServerLibs } from '../../lib/types';

// TODO: write to Kibana audit log file
const DEFAULT_NUM_TOKENS = 1;
export const createTokensRoute = (libs: CMServerLibs) => ({
  method: 'POST',
  path: '/api/beats/enrollment_tokens',
  licenseRequired: REQUIRED_LICENSES,
  requiredRoles: ['beats_admin'],
  config: {
    validate: {
      payload: Joi.object({
        num_tokens: Joi.number()
          .optional()
          .default(DEFAULT_NUM_TOKENS)
          .min(1),
      }).allow(null),
    },
  },
  handler: async (
    request: FrameworkRequest
  ): Promise<BaseReturnType | ReturnTypeBulkCreate<string>> => {
    const numTokens = get(request, 'payload.num_tokens', DEFAULT_NUM_TOKENS);

    try {
      const tokens = await libs.tokens.createEnrollmentTokens(request.user, numTokens);
      return {
        results: tokens.map(token => ({
          item: token,
          success: true,
          action: 'created',
        })),
        success: true,
      };
    } catch (err) {
      libs.framework.log(err.message);
      return {
        error: {
          message: 'An error occured, please check your Kibana logs',
          code: 500,
        },
        success: false,
      };
    }
  },
});
