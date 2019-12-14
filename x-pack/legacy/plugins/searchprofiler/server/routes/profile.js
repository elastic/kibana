/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

export function profileRoute(server, commonRouteConfig) {
  server.route({
    path: '/api/searchprofiler/profile',
    method: 'POST',
    config: {
      ...commonRouteConfig,
      validate: {
        payload: Joi.object()
          .keys({
            query: Joi.object().required(),
            index: Joi.string().required(),
            type: Joi.string().optional(),
          })
          .required(), //Joi validation
      },
    },
    handler: async request => {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      let parsed = request.payload.query;
      parsed.profile = true;
      parsed = JSON.stringify(parsed, null, 2);

      const body = {
        index: request.payload.index,
        type: request.payload.type,
        body: parsed,
      };
      try {
        const resp = await callWithRequest(request, 'search', body);
        return {
          ok: true,
          resp: resp,
        };
      } catch (err) {
        return {
          ok: false,
          err: err,
        };
      }
    },
  });
}
