/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { APMRequest, setupRequest } from '../../lib/helpers/setup_request';
import { createAgentConfiguration } from '../../lib/settings/agent_configuration/create_configuration';
import { AgentConfigurationIntake } from '../../lib/settings/agent_configuration/configuration_types';
import { agentConfigPayloadValidation } from './agent_configuration_payload_validation';

export const createAgentConfigurationRoute = {
  method: 'POST',
  path: `/api/apm/settings/agent-configuration/new`,
  options: {
    validate: {
      query: {
        _debug: Joi.bool()
      },
      payload: agentConfigPayloadValidation
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<unknown>) => {
    const setup = await setupRequest(req);
    const configuration = req.payload as AgentConfigurationIntake; // TODO: this should be typed as well
    return await createAgentConfiguration({
      configuration,
      setup
    });
  }
};
