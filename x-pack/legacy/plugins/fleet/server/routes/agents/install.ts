/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { FrameworkRequest } from '../../adapters/framework/adapter_types';
import { ReturnTypeCreate } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';

export const createGETAgentInstall = (libs: FleetServerLib) => ({
  method: 'GET',
  path: '/api/fleet/agents/install',
  config: {
    auth: false,
    validate: {
      query: {
        page: Joi.number().default(1),
      },
      headers: Joi.object({
        'kbn-fleet-enrollment-token': Joi.string().required(),
      }).options({
        allowUnknown: true,
      }),
      payload: {
        type: Joi.string()
          .allow('PERMANENT', 'EPHEMERAL_INSTANCE', 'TEMPORARY')
          .required(),
        metadata: Joi.object({
          local: Joi.object(),
          userProvided: Joi.object(),
        }).required(),
      },
    },
  },
  handler: async (
    request: FrameworkRequest<{
      query: { page: string };
      payload: {
        sharedId?: string;
        type: 'PERMANENT' | 'EPHEMERAL_INSTANCE';
        metadata: { local: any; userProvided: any };
      };
      headers: {
        'kbn-fleet-enrollment-token': string;
      };
    }>
  ): Promise<ReturnTypeCreate<any>> => {
    const enrollmentToken = request.headers['kbn-fleet-enrollment-token'];
    const { sharedId, type, metadata } = request.payload;
    const agent = await libs.agents.enroll(
      {
        kind: 'internal',
      },
      enrollmentToken,
      type,
      metadata,
      sharedId
    );

    return {
      action: 'created',
      success: true,
      item: agent,
    };
  },
});
