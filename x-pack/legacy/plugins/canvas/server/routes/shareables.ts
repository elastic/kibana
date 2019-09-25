/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server, RouteOptions } from 'hapi';
import archiver from 'archiver';

import {
  API_ROUTE_SHAREABLE_RUNTIME,
  API_ROUTE_SHAREABLE_RUNTIME_DOWNLOAD,
  API_ROUTE_SHAREABLE_ZIP,
} from '../../common/lib/constants';

import {
  SHAREABLE_RUNTIME_FILE,
  SHAREABLE_RUNTIME_NAME,
  SHAREABLE_RUNTIME_SRC,
} from '../../shareable_runtime/constants';

const PUBLIC_OPTIONS: RouteOptions = {
  auth: false,
};

export function shareableWorkpads(server: Server) {
  // get runtime
  server.route({
    method: 'GET',
    path: API_ROUTE_SHAREABLE_RUNTIME,
    handler: {
      file: SHAREABLE_RUNTIME_FILE,
    },
    options: PUBLIC_OPTIONS,
  });

  // download runtime
  server.route({
    method: 'GET',
    path: API_ROUTE_SHAREABLE_RUNTIME_DOWNLOAD,
    handler(_request, handler) {
      // @ts-ignore No type for inert Hapi handler
      const file = handler.file(SHAREABLE_RUNTIME_FILE);
      file.type('application/octet-stream');
      return file;
    },
    options: PUBLIC_OPTIONS,
  });

  server.route({
    method: 'POST',
    path: API_ROUTE_SHAREABLE_ZIP,
    handler(request, handler) {
      const workpad = request.payload;

      const archive = archiver('zip');
      archive.append(JSON.stringify(workpad), { name: 'workpad.json' });
      archive.file(`${SHAREABLE_RUNTIME_SRC}/template.html`, { name: 'index.html' });
      archive.file(SHAREABLE_RUNTIME_FILE, { name: `${SHAREABLE_RUNTIME_NAME}.js` });

      const response = handler.response(archive);
      response.header('content-type', 'application/zip');
      archive.finalize();

      return response;
    },
  });
}
