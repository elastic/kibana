/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { APMRequest, setupRequest } from '../../lib/helpers/setup_request';
import { createApmAgentConfigurationIndex } from '../../lib/settings/agent_configuration/create_agent_config_index';
import { getAgentConfigurationList } from '../../lib/settings/agent_configuration/get_agent_configuration_list';
import { PromiseReturnType } from '../../../typings/common';

export type AgentConfigurationListAPIResponse = PromiseReturnType<
  typeof agentConfigurationListRoute['handler']
>;
export const agentConfigurationListRoute = {
  method: 'GET',
  path: '/api/apm/settings/agent-configuration',
  options: {
    validate: {
      query: {
        _debug: Joi.bool()
      }
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<unknown>) => {
    await createApmAgentConfigurationIndex(req.server);

    const setup = await setupRequest(req);
    return await getAgentConfigurationList({
      setup
    });
  }
};
