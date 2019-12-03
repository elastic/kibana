/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { DETECTION_ENGINE_SIGNALS_STATUS_URL } from '../../../../../common/constants';
import { SignalsRequest, SignalSearchResponse, SignalSourceHit } from '../../alerts/types';
import { setSignalsStatusSchema } from '../schemas';
import { ServerFacade } from '../../../../types';
import { Signal } from '../../../types';
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
    const { signal_id: signalId, query, status } = request.payload;
    const { callWithRequest } = request.server.plugins.elasticsearch.getCluster('data');
    if (!callWithRequest) {
      return headers.response().code(404);
    }
    if (status) {
      if (signalId) {
        try {
          const signal = await callWithRequest(request, 'get', {
            id: signalId,
            index: '.siem-signals-devin-hurley', // fix how this is setup.
          });
          signal._source.signal.status = status;
          return callWithRequest(request, 'update', {
            id: signalId,
            index: '.siem-signals-devin-hurley', // fix how this is setup.
            body: { doc: { ...signal._source } },
          });
        } catch (exc) {
          // error while getting or updating signal with id: id in signal index .siem-signals
          return transformError(exc);
        }
      }
      if (query) {
        try {
          const signals: SignalSearchResponse = await callWithRequest(request, 'search', {
            index: '.siem-signals-devin-hurley', // fix how this is setup.
            body: {
              query: JSON.parse(query),
            },
          });
          signals.hits.hits.forEach(async (hit: SignalSourceHit) => {
            (hit._source.signal as Signal).status = status;
            await callWithRequest(request, 'update', {
              id: hit._id,
              index: '.siem-signals-devin-hurley', // fix how this is setup.
              body: { doc: { ...hit._source } },
            });
          });
        } catch (exc) {
          return transformError(exc);
        }
      }
      return true;
    }
  },
};

export const setSignalsStatusRoute = (server: ServerFacade) => {
  server.route(setSignalsStatusRouteDef);
};
