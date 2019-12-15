/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { RequestShim, ServerShim, RegisterRoute } from '../types';

export const handler = async (server: ServerShim, request: RequestShim) => {
  const { callWithRequest } = server.elasticsearch.getCluster('data');
  let parsed = request.payload.query;
  parsed.profile = true;
  parsed = JSON.stringify(parsed, null, 2);

  const body = {
    index: request.payload.index,
    body: parsed,
  };
  try {
    const resp = await callWithRequest(request, 'search', body);
    return {
      ok: true,
      resp,
    };
  } catch (err) {
    return {
      ok: false,
      err,
    };
  }
};

export const register = (server: ServerShim, route: RegisterRoute, commonConfig: any) => {
  route({
    path: '/api/searchprofiler/profile',
    method: 'POST',
    config: {
      ...commonConfig,
      validate: {
        payload: Joi.object()
          .keys({
            query: Joi.object().required(),
            index: Joi.string().required(),
            type: Joi.string().optional(),
          })
          .required(),
      },
    },
    handler: req => {
      return handler(server, { headers: req.headers, payload: req.payload as any });
    },
  });
};
