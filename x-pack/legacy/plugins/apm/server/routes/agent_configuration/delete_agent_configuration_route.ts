/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { deleteAgentConfiguration } from '../../lib/settings/agent_configuration/delete_agent_configuration';
import { APMRequest, setupRequest } from '../../lib/helpers/setup_request';

export const deleteAgentConfigurationRoute = {
  method: 'DELETE',
  path: `/api/apm/settings/agent-configuration/{configurationId}`,
  options: {
    validate: {
      query: {
        _debug: Joi.bool()
      }
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<unknown>) => {
    const setup = await setupRequest(req);
    const { configurationId } = req.params;
    return await deleteAgentConfiguration({
      configurationId,
      setup
    });
  }
};
