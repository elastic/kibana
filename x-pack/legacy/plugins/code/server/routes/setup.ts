/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestFacade, ResponseToolkitFacade } from '../..';
import { CodeServerRouter } from '../security';

export function setupRoute(router: CodeServerRouter) {
  router.route({
    method: 'get',
    path: '/api/code/setup',
    handler(req: RequestFacade, h: ResponseToolkitFacade) {
      return h.response('').code(200);
    },
  });
}
