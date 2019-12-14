/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { wrapError } from '../../../../../../../../plugins/security/server';
import { INTERNAL_API_BASE_PATH } from '../../../../../common/constants';

export function initGetApiKeysApi(server, callWithRequest, routePreCheckLicenseFn) {
  server.route({
    method: 'GET',
    path: `${INTERNAL_API_BASE_PATH}/api_key`,
    async handler(request) {
      try {
        const { isAdmin } = request.query;

        const result = await callWithRequest(request, 'shield.getAPIKeys', {
          owner: !isAdmin,
        });

        const validKeys = result.api_keys.filter(({ invalidated }) => !invalidated);

        return {
          apiKeys: validKeys,
        };
      } catch (error) {
        return wrapError(error);
      }
    },
    config: {
      pre: [routePreCheckLicenseFn],
      validate: {
        query: Joi.object()
          .keys({
            isAdmin: Joi.bool().required(),
          })
          .required(),
      },
    },
  });
}
