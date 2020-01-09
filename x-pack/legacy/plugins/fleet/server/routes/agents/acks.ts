/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import Boom from 'boom';

import { FrameworkRequest } from '../../adapters/framework/adapter_types';
import { BaseReturnType } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';

type AcksRequest = FrameworkRequest<{
  payload: {
    action_ids: string[];
  };
  params: {
    agentId: string;
  };
}>;

export const createPOSTAgentsAcksRoute = (libs: FleetServerLib) => ({
  method: 'POST',
  path: '/api/fleet/agents/{agentId}/acks',
  config: {
    auth: false,
    validate: {
      payload: {
        action_ids: Joi.array()
          .items(Joi.string())
          .required(),
      },
    },
  },
  handler: async (request: AcksRequest): Promise<BaseReturnType & { action: string }> => {
    const { action_ids: actionIds } = request.payload;
    const res = await libs.apiKeys.verifyAccessApiKey(request.user);
    if (!res.valid) {
      throw Boom.unauthorized('Invalid apiKey');
    }

    const agent = await libs.agents.getActiveByApiKeyId(
      libs.framework.getInternalUser(),
      res.accessApiKeyId
    );

    await libs.agents.acknowledgeActions(request.user, agent, actionIds);

    return {
      action: 'acks',
      success: true,
    };
  },
});
