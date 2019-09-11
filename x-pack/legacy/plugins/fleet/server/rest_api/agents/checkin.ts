/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import Boom from 'boom';

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isLeft } from 'fp-ts/lib/Either';
import { FrameworkRequest } from '../../libs/adapters/framework/adapter_types';
import { ReturnTypeCheckin } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';
import { TokenType } from '../../libs/adapters/tokens/adapter_types';
import { RuntimeAgentEvent, AgentEvent } from '../../libs/adapters/agent/adapter_type';

type CheckinRequest = FrameworkRequest<{
  query: { page: string };
  payload: {
    events: any[];
    local_metadata: any;
  };
  headers: {
    'kbn-fleet-access-token': string;
  };
  params: {
    agentId: string;
  };
}>;

export const createCheckinAgentsRoute = (libs: FleetServerLib) => ({
  method: 'POST',
  path: '/api/fleet/agents/{agentId}/checkin',
  config: {
    auth: false,
    validate: {
      query: {
        page: Joi.number().default(1),
      },
      headers: Joi.object({
        'kbn-fleet-access-token': Joi.string().required(),
      }).options({
        allowUnknown: true,
      }),
      payload: {
        events: Joi.array().required(),
        local_metadata: Joi.object().optional(),
      },
    },
  },
  handler: async (request: CheckinRequest): Promise<ReturnTypeCheckin> => {
    await validateToken(request, libs);
    const { events } = await validateAndDecodePayload(request);
    const { actions } = await libs.agents.checkin(
      request.params.agentId,
      events,
      request.payload.local_metadata
    );

    return {
      action: 'checkin',
      success: true,
      actions: actions.map(a => ({
        type: a.type,
      })),
    };
  },
});

async function validateToken(request: CheckinRequest, libs: FleetServerLib) {
  const jsonToken = request.headers['kbn-fleet-access-token'];
  const token = await libs.tokens.verify(jsonToken);
  if (!token.valid || token.type !== TokenType.ACCESS_TOKEN) {
    throw Boom.unauthorized('Invalid token');
  }
}

async function validateAndDecodePayload(
  request: CheckinRequest
): Promise<{ events: AgentEvent[] }> {
  const { events: rawEvents } = request.payload;
  const events: AgentEvent[] = rawEvents.map((event, idx) => {
    const result = RuntimeAgentEvent.decode(event);
    if (isLeft(result)) {
      throw Boom.badRequest(
        `Malformed request, event ${idx} is invalid, (${PathReporter.report(result)})`
      );
    }
    return result.right;
  });

  return { events };
}
