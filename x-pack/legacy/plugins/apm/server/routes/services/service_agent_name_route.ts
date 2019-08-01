/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getServiceAgentName } from '../../lib/services/get_service_agent_name';
import { withDefaultQueryParamValidators } from '../../lib/helpers/input_validation';
import {
  DefaultQueryParams,
  APMRequest,
  setupRequest
} from '../../lib/helpers/setup_request';

export const serviceAgentNameRoute = {
  method: 'GET',
  path: `/api/apm/services/{serviceName}/agent_name`,
  options: {
    validate: {
      query: withDefaultQueryParamValidators()
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<DefaultQueryParams>) => {
    const setup = await setupRequest(req);
    const { serviceName } = req.params;

    return getServiceAgentName(serviceName, setup);
  }
};
