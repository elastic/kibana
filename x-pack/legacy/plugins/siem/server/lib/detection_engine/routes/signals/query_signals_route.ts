/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../common/constants';
import { SignalsQueryRequest } from '../../signals/types';
import { querySignalsSchema } from '../schemas/query_signals_index_schema';
import { ServerFacade } from '../../../../types';
import { transformError, getIndex } from '../utils';

export const querySignalsRouteDef = (server: ServerFacade): Hapi.ServerRoute => {
  return {
    method: 'POST',
    path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
        payload: querySignalsSchema,
      },
    },
    async handler(request: SignalsQueryRequest) {
      const { query, aggs } = request.payload;
      const body = { query, aggs };
      const index = getIndex(request, server);
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      try {
        return callWithRequest(request, 'search', {
          index,
          body,
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
