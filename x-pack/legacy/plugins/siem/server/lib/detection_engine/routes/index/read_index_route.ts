/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import { DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';
import { LegacyServices, LegacyRequest } from '../../../../types';
import { GetScopedClients } from '../../../../services';
import { transformError, getIndex } from '../utils';
import { getIndexExists } from '../../index/get_index_exists';

export const createReadIndexRoute = (
  config: LegacyServices['config'],
  getClients: GetScopedClients
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
    async handler(request: LegacyRequest, headers) {
      try {
        const { clusterClient, spacesClient } = await getClients(request);
        const callCluster = clusterClient.callAsCurrentUser;

        const index = getIndex(spacesClient.getSpaceId, config);
        const indexExists = await getIndexExists(callCluster, index);

        if (indexExists) {
          return headers.response({ name: index }).code(200);
        } else {
          return headers
            .response({
              message: 'index for this space does not exist',
              status_code: 404,
            })
            .code(404);
        }
      } catch (err) {
        const error = transformError(err);
        return headers
          .response({
            message: error.message,
            status_code: error.statusCode,
          })
          .code(error.statusCode);
      }
    },
  };
};

export const readIndexRoute = (
  route: LegacyServices['route'],
  config: LegacyServices['config'],
  getClients: GetScopedClients
) => {
  route(createReadIndexRoute(config, getClients));
};
