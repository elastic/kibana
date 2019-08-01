/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { withDefaultQueryParamValidators } from '../../lib/helpers/input_validation';
import { getEnvironments } from '../../lib/ui_filters/get_environments';
import { APMRequest, setupRequest } from '../../lib/helpers/setup_request';

interface Query {
  _debug?: string;
  start?: string;
  end?: string;
  serviceName?: string;
}

export const environmentsRoute = {
  method: 'GET',
  path: '/api/apm/ui_filters/environments',
  options: {
    validate: {
      query: withDefaultQueryParamValidators({
        serviceName: Joi.string()
      })
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<Query>) => {
    const setup = await setupRequest(req);
    const { serviceName } = req.query;
    return getEnvironments(setup, serviceName);
  }
};
