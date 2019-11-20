/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerGetRoute } from './register_get_route';
import { ServerShimWithRouter } from '../../../types';

export function registerIndicesRoutes(server: ServerShimWithRouter) {
  registerGetRoute(server);
}
