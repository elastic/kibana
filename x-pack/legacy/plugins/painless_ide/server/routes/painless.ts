/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Router, RouterRouteHandler } from '../../../../server/lib/create_router';

export const getPainlessHandler: RouterRouteHandler = async (
  _req,
  callWithRequest
): Promise<{}> => {
  // TODO: Change this to return something useful instead of ES tasks.
  return await callWithRequest('tasks.list');
};

export function registerPainlessRoutes(router: Router) {
  router.get('/painless', getPainlessHandler);
}
