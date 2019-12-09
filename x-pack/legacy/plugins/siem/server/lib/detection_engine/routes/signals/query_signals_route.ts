/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { DETECTION_ENGINE_SIGNALS_URL } from '../../../../../common/constants';
import { SignalsQueryRequest } from '../../alerts/types';
import { querySignalsSchema } from '../schemas';
import { ServerFacade } from '../../../../types';
import { transformError, getIndex } from '../utils';

export const querySignalsRouteDef = (server: ServerFacade): Hapi.ServerRoute => {
  return {
    method: 'GET',
    path: DETECTION_ENGINE_SIGNALS_URL,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
        query: querySignalsSchema,
      },
    },
    async handler(request: SignalsQueryRequest, _headers) {
      const { query: searchQuery } = request;
      const index = getIndex(request, server);
      const { callWithRequest } = request.server.plugins.elasticsearch.getCluster('data');
      try {
        return callWithRequest(request, 'search', {
          index,
          body: searchQuery,
        });
      } catch (exc) {
        // error while getting or updating signal with id: id in signal index .siem-signals
        return transformError(exc);
      }
    },
  };
};

export const querySignalsRoute = (server: ServerFacade) => {
  server.route(querySignalsRouteDef(server));
};
