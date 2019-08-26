/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server, RouteOptions } from 'hapi';
import { readFileSync } from 'fs';

import {
  API_ROUTE_SNAPSHOT_RUNTIME,
  API_ROUTE_SNAPSHOT_RUNTIME_DOWNLOAD,
} from '../../common/lib/constants';

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
    handler: {
      file: RUNTIME_FILE,
    },
    options: PUBLIC_OPTIONS,
  });

  // download runtime
  server.route({
    method: 'GET',
    path: API_ROUTE_SNAPSHOT_RUNTIME_DOWNLOAD,
    handler(_request, handler) {
      const file = handler.file(RUNTIME_FILE);
      file.type('application/octet-stream');
      return file;
    },
    options: PUBLIC_OPTIONS,
  });
}
