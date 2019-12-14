/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

import { verifyApiAccessPre, getCallClusterPre, callEsGraphExploreApi } from '../lib';

export const graphExploreRoute = {
  path: '/api/graph/graphExplore',
  method: 'POST',
  config: {
    pre: [verifyApiAccessPre, getCallClusterPre],
    validate: {
      payload: Joi.object()
        .keys({
          index: Joi.string().required(),
          query: Joi.object()
            .required()
            .unknown(true),
        })
        .default(),
    },
    handler(request) {
      return callEsGraphExploreApi({
        callCluster: request.pre.callCluster,
        index: request.payload.index,
        query: request.payload.query,
      });
    },
  },
};
