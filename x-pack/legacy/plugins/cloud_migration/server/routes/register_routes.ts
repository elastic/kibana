/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router } from '../../../../server/lib/create_router';
import { Plugins } from '../shim';
import { registerClusterRoutes } from './cluster';

export const registerRoutes = (router: Router, plugins: Plugins): void => {
  registerClusterRoutes(router, plugins);
};
