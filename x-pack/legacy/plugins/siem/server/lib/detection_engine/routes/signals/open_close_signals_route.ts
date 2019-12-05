/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { DETECTION_ENGINE_SIGNALS_STATUS_URL } from '../../../../../common/constants';
import { SignalsRequest } from '../../alerts/types';
import { setSignalsStatusSchema } from '../schemas';
import { ServerFacade } from '../../../../types';
import { transformError } from '../utils';

export const setSignalsStatusRouteDef: Hapi.ServerRoute = {
  method: 'POST',
  path: DETECTION_ENGINE_SIGNALS_STATUS_URL,
  options: {
    tags: ['access:siem'],
    validate: {
      options: {
        abortEarly: false,
      },
      payload: setSignalsStatusSchema,
    },
  },
  async handler(request: SignalsRequest, headers) {
    const { signal_ids: signalIds, query, status } = request.payload;
    const { callWithRequest } = request.server.plugins.elasticsearch.getCluster('data');
    if (!callWithRequest) {
      return headers.response().code(404);
    }
    if (status) {
      let queryObject;
      if (signalIds) {
        queryObject = { ids: { values: signalIds } };
      }
      if (query) {
        queryObject = JSON.parse(query);
      }
      try {
        return callWithRequest(request, 'updateByQuery', {
          index: '.siem-signals-devin-hurley',
          body: {
            script: {
              source: `ctx._source.signal.status = '${status}'`,
              lang: 'painless',
            },
            query: queryObject,
          },
        });
      } catch (exc) {
        // error while getting or updating signal with id: id in signal index .siem-signals
        return transformError(exc);
      }
    }
  },
};

export const setSignalsStatusRoute = (server: ServerFacade) => {
  server.route(setSignalsStatusRouteDef);
};
