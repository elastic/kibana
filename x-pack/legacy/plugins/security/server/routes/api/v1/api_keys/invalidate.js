/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { wrapError } from '../../../../../../../../plugins/security/server';
import { INTERNAL_API_BASE_PATH } from '../../../../../common/constants';

export function initInvalidateApiKeysApi(server, callWithRequest, routePreCheckLicenseFn) {
  server.route({
    method: 'POST',
    path: `${INTERNAL_API_BASE_PATH}/api_key/invalidate`,
    async handler(request) {
      try {
        const { apiKeys, isAdmin } = request.payload;
        const itemsInvalidated = [];
        const errors = [];

        // Send the request to invalidate the API key and return an error if it could not be deleted.
        const sendRequestToInvalidateApiKey = async id => {
          try {
            const body = { id };

            if (!isAdmin) {
              body.owner = true;
            }

            await callWithRequest(request, 'shield.invalidateAPIKey', { body });
            return null;
          } catch (error) {
            return wrapError(error);
          }
        };

        const invalidateApiKey = async ({ id, name }) => {
          const error = await sendRequestToInvalidateApiKey(id);
          if (error) {
            errors.push({ id, name, error });
          } else {
            itemsInvalidated.push({ id, name });
          }
        };

        // Invalidate all API keys in parallel.
        await Promise.all(apiKeys.map(key => invalidateApiKey(key)));

        return {
          itemsInvalidated,
          errors,
        };
      } catch (error) {
        return wrapError(error);
      }
    },
    config: {
      pre: [routePreCheckLicenseFn],
      validate: {
        payload: Joi.object({
          apiKeys: Joi.array()
            .items(
              Joi.object({
                id: Joi.string().required(),
                name: Joi.string().required(),
              })
            )
            .required(),
          isAdmin: Joi.bool().required(),
        }),
      },
    },
  });
}
