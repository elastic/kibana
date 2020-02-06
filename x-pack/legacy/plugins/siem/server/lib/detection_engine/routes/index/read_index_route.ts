/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Boom from 'boom';

import { DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';
import { LegacySetupServices, RequestFacade } from '../../../../plugin';
import { GetScopedClientServices } from '../../../../services';
import { transformError, getIndex } from '../utils';
import { getIndexExists } from '../../index/get_index_exists';

export const createReadIndexRoute = (
  config: LegacySetupServices['config'],
  getServices: GetScopedClientServices
): Hapi.ServerRoute => {
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
        const { callCluster, getSpaceId } = await getServices(request);

        const index = getIndex(getSpaceId, config);
        const indexExists = await getIndexExists(callCluster, index);

        if (indexExists) {
          // head request is used for if you want to get if the index exists
          // or not and it will return a content-length: 0 along with either a 200 or 404
          // depending on if the index exists or not.
          if (request.method.toLowerCase() === 'head') {
            return headers.response().code(200);
          } else {
            return headers.response({ name: index }).code(200);
          }
        } else {
          if (request.method.toLowerCase() === 'head') {
            return headers.response().code(404);
          } else {
            return new Boom('index for this space does not exist', { statusCode: 404 });
          }
        }
      } catch (err) {
        return transformError(err);
      }
    },
  };
};

export const readIndexRoute = (
  route: LegacySetupServices['route'],
  config: LegacySetupServices['config'],
  getServices: GetScopedClientServices
) => {
  route(createReadIndexRoute(config, getServices));
};
