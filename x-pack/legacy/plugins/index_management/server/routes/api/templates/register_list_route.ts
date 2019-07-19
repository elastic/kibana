/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Router, RouterRouteHandler } from '../../../../../../server/lib/create_router';
import { fetchTemplates } from '../../../lib/fetch_templates';

const handler: RouterRouteHandler = async (_req, callWithRequest) => {
  return fetchTemplates(callWithRequest);
};

export function registerListRoute(router: Router) {
  router.get('templates', handler);
}
