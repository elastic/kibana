/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import Boom from 'boom';
import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { FrameworkRequest } from '../../adapters/framework/adapter_types';
import { ReturnTypeCreate } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';
import { RuntimeAgentActionData } from '../../repositories/agents/types';

export const createAgentsAddActionRoute = (libs: FleetServerLib) => ({
  method: 'POST',
  path: '/api/fleet/agents/{agentId}/actions',
  config: {
    validate: {
      payload: Joi.object(),
    },
  },
  handler: async (
    request: FrameworkRequest<{ params: { agentId: string }; payload: any }>
  ): Promise<ReturnTypeCreate<any>> => {
    const result = RuntimeAgentActionData.decode(request.payload);
    if (isLeft(result)) {
      throw Boom.badRequest(
        `Malformed request, action is invalid, (${PathReporter.report(result)})`
      );
    }
    const action = await libs.agents.addAction(request.user, request.params.agentId, result.right);

    return { item: action, success: true, action: 'created' };
  },
});
