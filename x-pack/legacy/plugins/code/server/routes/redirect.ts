/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestFacade, ServerFacade } from '../../';
import { Logger } from '../log';

export function redirectRoute(server: ServerFacade, redirectUrl: string, log: Logger) {
  const proxyHandler = {
    proxy: {
      passThrough: true,
      async mapUri(request: RequestFacade) {
        let uri;
        uri = `${redirectUrl}${request.path}`;
        if (request.url.search) {
          uri += request.url.search;
        }
        log.info(`redirect ${request.path}${request.url.search || ''} to ${uri}`);
        return {
          uri,
        };
      },
    },
  };

  server.route({
    path: '/api/code/{p*}',
    method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    handler: proxyHandler,
  });

  server.route({
    path: '/api/code/lsp/{p*}',
    method: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    handler: proxyHandler,
  });
}
