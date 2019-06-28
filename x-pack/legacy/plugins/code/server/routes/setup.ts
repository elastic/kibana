/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseToolkit } from 'hapi';
import { CodeServerRouter } from '../security';

export function setupRoute(server: CodeServerRouter) {
  server.route({
    method: 'get',
    path: '/api/code/setup',
    handler(req, h: ResponseToolkit) {
      return h.response('').code(200);
    },
  });
}
