/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalCoreSetup } from 'src/core/server';
import { environmentsRoute } from './environments_route';

export function initUIFiltersApi(core: InternalCoreSetup) {
  const { server } = core.http;
  server.route(environmentsRoute);
}
