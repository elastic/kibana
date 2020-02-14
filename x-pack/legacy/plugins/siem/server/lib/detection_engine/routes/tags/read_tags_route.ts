/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import { DETECTION_ENGINE_TAGS_URL } from '../../../../../common/constants';
import { LegacyServices, LegacyRequest } from '../../../../types';
import { transformError } from '../utils';
import { readTags } from '../../tags/read_tags';
import { GetScopedClients } from '../../../../services';

export const createReadTagsRoute = (getClients: GetScopedClients): Hapi.ServerRoute => ({
  method: 'GET',
  path: DETECTION_ENGINE_TAGS_URL,
  options: {
    tags: ['access:siem'],
    validate: {
      options: {
        abortEarly: false,
      },
    },
  },
  async handler(request: LegacyRequest, headers) {
    const { alertsClient } = await getClients(request);

    if (!alertsClient) {
      return headers.response().code(404);
    }

    try {
      const tags = await readTags({
        alertsClient,
      });
      return tags;
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
});

export const readTagsRoute = (route: LegacyServices['route'], getClients: GetScopedClients) => {
  route(createReadTagsRoute(getClients));
};
