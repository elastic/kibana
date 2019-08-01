/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { APMRequest, setupRequest } from '../../lib/helpers/setup_request';
import { getEnvironments } from '../../lib/settings/agent_configuration/get_environments';

export const environmentsRoute = {
  method: 'GET',
  path: `/api/apm/settings/agent-configuration/services/{serviceName}/environments`,
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
    const { serviceName } = req.params;
    return await getEnvironments({
      serviceName,
      setup
    });
  }
};
