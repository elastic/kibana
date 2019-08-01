/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { InternalCoreSetup } from 'src/core/server';
import { withDefaultQueryParamValidators } from '../lib/helpers/input_validation';
import { setupRequest } from '../lib/helpers/setup_request';
import { getEnvironments } from '../lib/ui_filters/get_environments';

export function initUIFiltersApi(core: InternalCoreSetup) {
  const { server } = core.http;
  server.route({
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
    handler: async req => {
      const setup = await setupRequest(req);
      const { serviceName } = req.query as {
        serviceName?: string;
      };
      return getEnvironments(setup, serviceName);
    }
  });
}
