/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  SHAREABLE_RUNTIME_OUTPUT,
} from '../../shareable_runtime/constants';

import { CoreSetup } from '../shim';

export function shareableWorkpads(route: CoreSetup['http']['route']) {
  // get runtime
  route({
    method: 'GET',
    path: API_ROUTE_SHAREABLE_RUNTIME,
    options: {
      files: {
        relativeTo: SHAREABLE_RUNTIME_OUTPUT,
      },
    },
    handler: {
      file: {
        path: SHAREABLE_RUNTIME_FILE,
      },
    },
  });

  // download runtime
  route({
    method: 'GET',
    path: API_ROUTE_SHAREABLE_RUNTIME_DOWNLOAD,
    options: {
      files: {
        relativeTo: SHAREABLE_RUNTIME_OUTPUT,
      },
    },
    handler(_request, handler) {
      // @ts-ignore No type for inert Hapi handler
      const file = handler.file(SHAREABLE_RUNTIME_FILE);
      file.type('application/octet-stream');
      return file;
    },
  });

  route({
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
