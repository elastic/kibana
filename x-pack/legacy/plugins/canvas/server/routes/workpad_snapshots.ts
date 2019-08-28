/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server, RouteOptions } from 'hapi';
import archiver from 'archiver';

import {
  API_ROUTE_SNAPSHOT_RUNTIME,
  API_ROUTE_SNAPSHOT_RUNTIME_DOWNLOAD,
  API_ROUTE_SNAPSHOT_ZIP,
} from '../../common/lib/constants';

import { RUNTIME_FILE, RUNTIME_NAME, RUNTIME_SRC } from '../../external_runtime/constants';

const PUBLIC_OPTIONS: RouteOptions = {
  auth: false,
};

export function workpadSnapshots(server: Server) {
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
      // @ts-ignore No type for inert Hapi handler
      const file = handler.file(RUNTIME_FILE);
      file.type('application/octet-stream');
      return file;
    },
    options: PUBLIC_OPTIONS,
  });

  server.route({
    method: 'POST',
    path: API_ROUTE_SNAPSHOT_ZIP,
    handler(request, handler) {
      const workpad = request.payload;

      const archive = archiver('zip');
      archive.append(JSON.stringify(workpad), { name: 'workpad.json' });
      archive.file(`${RUNTIME_SRC}/template.html`, { name: 'index.html' });
      archive.file(RUNTIME_FILE, { name: `${RUNTIME_NAME}.js` });

      const response = handler.response(archive);
      response.header('content-type', 'application/zip');
      archive.finalize();

      return response;
    },
  });
}
