/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import Joi from 'joi';

import {
  getDeprecationLoggingStatus,
  setDeprecationLogging,
} from '../lib/es_deprecation_logging_apis';
import { EsVersionPrecheck } from '../lib/es_version_precheck';
import { ServerShim } from '../types';
import { createRequestShim } from './create_request_shim';

export function registerDeprecationLoggingRoutes(server: ServerShim) {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');

  server.route({
    path: '/api/upgrade_assistant/deprecation_logging',
    method: 'GET',
    options: {
      pre: [EsVersionPrecheck],
    },
    async handler(request) {
      const reqShim = createRequestShim(request);
      try {
        return await getDeprecationLoggingStatus(callWithRequest, reqShim);
      } catch (e) {
        return Boom.boomify(e, { statusCode: 500 });
      }
    },
  });

  server.route({
    path: '/api/upgrade_assistant/deprecation_logging',
    method: 'PUT',
    options: {
      pre: [EsVersionPrecheck],
      validate: {
        payload: Joi.object({
          isEnabled: Joi.boolean(),
        }),
      },
    },
    async handler(request) {
      const reqShim = createRequestShim(request);
      try {
        const { isEnabled } = reqShim.payload as { isEnabled: boolean };
        return await setDeprecationLogging(callWithRequest, reqShim, isEnabled);
      } catch (e) {
        return Boom.boomify(e, { statusCode: 500 });
      }
    },
  });
}
