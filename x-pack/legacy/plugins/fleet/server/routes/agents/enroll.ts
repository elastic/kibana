/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { FrameworkRequest } from '../../adapters/framework/adapter_types';
import { ReturnTypeCreate } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';
import { Agent } from '../../../common/types/domain_data';

export const createEnrollAgentsRoute = (libs: FleetServerLib) => ({
  method: 'POST',
  path: '/api/fleet/agents/enroll',
  options: {
    auth: false,
    validate: {
      payload: {
        shared_id: Joi.string().optional(),
        type: Joi.string()
          .allow('PERMANENT', 'EPHEMERAL', 'TEMPORARY')
          .required(),
        metadata: Joi.object({
          local: Joi.object(),
          user_provided: Joi.object(),
        }).required(),
      },
    },
  },
  handler: async (
    request: FrameworkRequest<{
      payload: {
        shared_id?: string;
        type: 'PERMANENT' | 'EPHEMERAL';
        metadata: { local: any; user_provided: any };
      };
      headers: {
        authorization: string;
      };
    }>
  ): Promise<ReturnTypeCreate<Agent>> => {
    const { shared_id: sharedId, type, metadata } = request.payload;
    const agent = await libs.agents.enroll(
      request.user,
      type,
      metadata && {
        local: metadata.local,
        userProvided: metadata.user_provided,
      },
      sharedId
    );

    return {
      action: 'created',
      success: true,
      item: agent,
    };
  },
});
