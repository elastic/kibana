/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import { DETECTION_ENGINE_INDEX_URL } from '../../../../common/constants';
import { ServerFacade, RequestFacade } from '../../../types';
import { transformError, getIndex, callWithRequestFactory } from './utils';
import { readIndex } from '../alerts/read_index';
import { getIndexExists } from '../alerts/get_index_exists';

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
      },
    },
    async handler(request: RequestFacade, headers) {
      try {
        const index = getIndex(request, server);
        const callWithRequest = callWithRequestFactory(request);
        // head request is used for if you want to get if the index exists
        // or not and it will return a content-length: 0 along with either a 200 or 404
        // depending on if the index exists or not.
        if (request.method.toLowerCase() === 'head') {
          const indexExists = await getIndexExists(callWithRequest, index);
          if (indexExists) {
            return headers.response().code(200);
          } else {
            return headers.response().code(404);
          }
        } else {
          const indexSettings = await readIndex(callWithRequest, index);
          return indexSettings;
        }
      } catch (err) {
        return transformError(err);
      }
    },
  };
};

export const readIndexRoute = (server: ServerFacade) => {
  server.route(createReadIndexRoute(server));
};
