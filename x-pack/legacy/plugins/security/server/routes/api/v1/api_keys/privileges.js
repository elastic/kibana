/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapError } from '../../../../../../../../plugins/security/server';
import { INTERNAL_API_BASE_PATH } from '../../../../../common/constants';

export function initCheckPrivilegesApi(server, callWithRequest, routePreCheckLicenseFn) {
  server.route({
    method: 'GET',
    path: `${INTERNAL_API_BASE_PATH}/api_key/privileges`,
    async handler(request) {
      try {
        const result = await Promise.all([
          callWithRequest(request, 'shield.hasPrivileges', {
            body: {
              cluster: ['manage_security', 'manage_api_key'],
            },
          }),
          new Promise(async (resolve, reject) => {
            try {
              const result = await callWithRequest(request, 'shield.getAPIKeys', {
                owner: true,
              });
              //  If the API returns a truthy result that means it's enabled.
              resolve({ areApiKeysEnabled: !!result });
            } catch (e) {
              // This is a brittle dependency upon message. Tracked by https://github.com/elastic/elasticsearch/issues/47759.
              if (e.message.includes('api keys are not enabled')) {
                return resolve({ areApiKeysEnabled: false });
              }

              // It's a real error, so rethrow it.
              reject(e);
            }
          }),
        ]);

        const [
          {
            cluster: { manage_security: manageSecurity, manage_api_key: manageApiKey },
          },
          { areApiKeysEnabled },
        ] = result;

        const isAdmin = manageSecurity || manageApiKey;

        return {
          areApiKeysEnabled,
          isAdmin,
        };
      } catch (error) {
        return wrapError(error);
      }
    },
    config: {
      pre: [routePreCheckLicenseFn],
    },
  });
}
