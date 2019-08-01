/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalCoreSetup } from 'src/core/server';
import { traceListRoute } from './trace_list_route';
import { traceRoute } from './trace_route';

export function initTracesApi(core: InternalCoreSetup) {
  const { server } = core.http;

  // Get trace list
  server.route(traceListRoute);

  // Get individual trace
  server.route(traceRoute);
}
