/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import { DETECTION_ENGINE_TAGS_URL } from '../../../../../common/constants';
import { ServerFacade, RequestFacade } from '../../../../types';
import { transformError } from '../utils';
import { readTags } from '../../tags/read_tags';

export const createReadTagsRoute: Hapi.ServerRoute = {
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
  async handler(request: RequestFacade, headers) {
    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    if (!alertsClient) {
      return headers.response().code(404);
    }

    try {
      const tags = await readTags({
        alertsClient,
      });
      return tags;
    } catch (err) {
      return transformError(err);
    }
  },
};

export const readTagsRoute = (server: ServerFacade) => {
  server.route(createReadTagsRoute);
};
