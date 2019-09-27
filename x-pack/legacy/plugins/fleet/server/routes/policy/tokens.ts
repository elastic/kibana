/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import Boom from 'boom';

import { FrameworkRequest } from '../../adapters/framework/adapter_types';
import { ReturnTypeGet } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';

export const createGetEnrollmentTokenRoute = (libs: FleetServerLib) => ({
  method: 'GET',
  path: '/api/fleet/policies/{policyId}/enrollment-tokens',
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
    const { policyId } = request.params;
    const token = await libs.tokens.getEnrollmentTokenForPolicy(
      request.user,
      policyId,
      Boolean(request.query.regenerate)
    );

    if (!token) {
      throw Boom.notFound(`token not found for policy ${policyId}`);
    }

    return { item: token, success: true };
  },
});
