/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalCoreSetup } from 'src/core/server';
import { serviceListRoute } from './service_list_route';
import { serviceAgentNameRoute } from './service_agent_name_route';
import { serviceTransactionTypesRoute } from './service_transaction_types_routes';

export function initServicesApi(core: InternalCoreSetup) {
  const { server } = core.http;
  server.route(serviceListRoute);
  server.route(serviceAgentNameRoute);
  server.route(serviceTransactionTypesRoute);
}
