/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { ServerRoute } from 'hapi';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmAgentConfigurationIndex } from '../../lib/settings/agent_configuration/create_agent_config_index';
import { searchAgentConfigurations } from '../../lib/settings/agent_configuration/search';

interface Payload {
  service: {
    name: string;
    environment?: string;
  };
}

export const searchAgentConfigurationsRoute: ServerRoute = {
  method: 'POST',
  path: '/api/apm/settings/agent-configuration/search',
  options: {
    validate: {
      query: {
        _debug: Joi.bool()
      }
    },
    tags: ['access:apm']
  },
  handler: async (req, h) => {
    await createApmAgentConfigurationIndex(req.server);
    const setup = await setupRequest(req);
    const payload = req.payload as Payload;
    const serviceName = payload.service.name;
    const environment = payload.service.environment;
    const config = await searchAgentConfigurations({
      serviceName,
      environment,
      setup
    });

    if (!config) {
      return h.response().code(404);
    }

    return config;
  }
};
