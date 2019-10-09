/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, KibanaResponseFactory, RequestHandlerContext } from 'src/core/server';

import { CodeServerRouter } from '../security';
import { CodeServices } from '../distributed/code_services';
import { SetupDefinition } from '../distributed/apis';

export function setupRoute(router: CodeServerRouter, codeServices: CodeServices) {
  const setupService = codeServices.serviceFor(SetupDefinition);
  router.route({
    method: 'get',
    path: '/api/code/setup',
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const endpoint = await codeServices.locate(req, '');
      const setup = await setupService.setup(endpoint, {});
      return res.ok({ body: setup });
    },
  });
}
