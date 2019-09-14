/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapError } from '../../../../../../../../plugins/security/server';

export function initInvalidateApiKeysApi(server, callWithRequest, routePreCheckLicenseFn) {
  server.route({
    method: 'POST',
    path: '/api/security/api_key/invalidate',
    async handler(request) {
      try {
        const { apiKeys, isAdmin } = request.payload;
        const itemsInvalidated = [];
        const errors = [];

        // Send the request to invalidate the API key and return an error if it could not be deleted.
        const sendRequestToInvalidateApiKey = async (id) => {
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
        await Promise.all(apiKeys.map((key) => invalidateApiKey(key)));

        return {
          itemsInvalidated,
          errors,
        };
      } catch (error) {
        return wrapError(error);
      }
    },
    config: {
      pre: [routePreCheckLicenseFn]
    }
  });
}
