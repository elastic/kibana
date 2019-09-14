/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapError } from '../../../../../../../../plugins/security/server';

export function initGetApiKeysApi(server, callWithRequest, routePreCheckLicenseFn) {
  server.route({
    method: 'GET',
    path: '/api/security/api_key',
    async handler(request) {
      try {
        const { isAdmin } = request.query;
        const path = `/_security/api_key${isAdmin === 'true' ? '' : '?owner=true'}`;

        const result = await callWithRequest(
          request,
          'transport.request',
          {
            method: 'GET',
            path,
          }
        );

        const validKeys = result.api_keys.filter(({ invalidated }) => !invalidated);

        return {
          apiKeys: validKeys,
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
