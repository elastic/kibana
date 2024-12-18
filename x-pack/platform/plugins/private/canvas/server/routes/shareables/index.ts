/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteInitializerDeps } from '..';
import { initializeZipShareableWorkpadRoute } from './zip';
import { initializeDownloadShareableWorkpadRoute } from './download';

export function initShareablesRoutes(deps: RouteInitializerDeps) {
  initializeDownloadShareableWorkpadRoute(deps);
  initializeZipShareableWorkpadRoute(deps);
}
