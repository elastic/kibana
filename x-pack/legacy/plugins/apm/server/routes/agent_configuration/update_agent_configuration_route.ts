/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { APMRequest, setupRequest } from '../../lib/helpers/setup_request';
import { updateAgentConfiguration } from '../../lib/settings/agent_configuration/update_configuration';
import { agentConfigPayloadValidation } from './agent_configuration_payload_validation';
import { AgentConfigurationIntake } from '../../lib/settings/agent_configuration/configuration_types';

export const updateAgentConfigurationRoute = {
  method: 'PUT',
  path: `/api/apm/settings/agent-configuration/{configurationId}`,
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
    const { configurationId } = req.params;
    const configuration = req.payload as AgentConfigurationIntake;
    return await updateAgentConfiguration({
      configurationId,
      configuration,
      setup
    });
  }
};
