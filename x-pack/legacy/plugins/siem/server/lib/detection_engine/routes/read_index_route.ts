/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import {
  DETECTION_ENGINE_INDEX_URL,
  SIGNALS_INDEX_KEY,
  APP_ID,
} from '../../../../common/constants';
import { createIndex } from '../alerts/create_index';

// TODO: The schema
// import { createRulesSchema } from './schemas';

import { ServerFacade, RequestFacade } from '../../../types';
import { transformError } from './utils';

export const createReadIndexRoute = (server: ServerFacade): Hapi.ServerRoute => {
  return {
    method: 'GET',
    path: DETECTION_ENGINE_INDEX_URL,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
        // payload: createRulesSchema, TODO: The Schema
      },
    },
    async handler(context, request: RequestFacade, headers) {
      const spaceId = server.plugins.spaces.getSpaceId(request);
      const signalsIndex = server.config().get(`xpack.${APP_ID}.${SIGNALS_INDEX_KEY}`);
      const index = `${signalsIndex}-${spaceId}`;
      const elasticsearch = request.server.plugins.elasticsearch;
      const { callWithRequest } = elasticsearch.getCluster('data');
      try {
        const result = await callWithRequest(request, 'indices.getSettings', {
          index,
        });
        return result;
      } catch (err) {
        return transformError(err);
      }
    },
  };
};

export const readIndexRoute = (server: ServerFacade) => {
  server.route(createReadIndexRoute(server));
};
