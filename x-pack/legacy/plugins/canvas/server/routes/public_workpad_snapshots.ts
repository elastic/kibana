/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server, RouteOptions } from 'hapi';
import { readFileSync } from 'fs';

import { API_ROUTE_SNAPSHOT_RUNTIME } from '../../common/lib/constants';

// @ts-ignore
import { RUNTIME_FILE } from '../../external_runtime/constants';

const PUBLIC_OPTIONS: RouteOptions = {
  auth: false,
};

export function publicWorkpadSnapshots(server: Server) {
  // get runtime
  server.route({
    method: 'GET',
    path: API_ROUTE_SNAPSHOT_RUNTIME,
    handler(request, handler) {
      try {
        const response = handler.response(readFileSync(RUNTIME_FILE));
        response.type('text/javascript');
        return response;
      } catch (error) {
        throw Boom.internal();
      }
    },
    options: PUBLIC_OPTIONS,
  });
}
