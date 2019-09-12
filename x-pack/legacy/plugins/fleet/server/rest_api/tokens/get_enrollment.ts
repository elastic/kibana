/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import Boom from 'boom';

import { FrameworkRequest } from '../../libs/adapters/framework/adapter_types';
import { ReturnTypeGet } from '../../../common/return_types';
import { FleetServerLibRequestFactory } from '../../libs/compose/types';

export const createGetEnrollmentTokenRoute = (libsFactory: FleetServerLibRequestFactory) => ({
  method: 'GET',
  path: '/api/policy/{policyId}/enrollment-tokens',
  config: {
    auth: false,
    validate: {
      query: Joi.object({
        regenerate: Joi.boolean().default(false),
      }),
    },
  },
  handler: async (
    request: FrameworkRequest<{ params: { policyId: string }; query: { regenerate: string } }>
  ): Promise<ReturnTypeGet<any>> => {
    const { tokens } = libsFactory(request);
    const { policyId } = request.params;
    const token = await tokens.getEnrollmentTokenForPolicy(policyId, Boolean(request.query));

    if (!token) {
      throw Boom.notFound(`token not found for policy ${policyId}`);
    }

    return { item: token, success: true };
  },
});
