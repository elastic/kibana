/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { AgentName } from '../../typings/es_schemas/ui/fields/Agent';
import { createApmTelementry, storeApmTelemetry } from '../lib/apm_telemetry';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceAgentName } from '../lib/services/get_service_agent_name';
import { getServices } from '../lib/services/get_services';
import { getServiceTransactionTypes } from '../lib/services/get_service_transaction_types';
import { createRoute } from './create_route';
import { uiFiltersRt, rangeRt } from './default_api_types';

export const servicesRoute = createRoute(core => ({
  path: '/api/apm/services',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt])
  },
  handler: async req => {
    const setup = await setupRequest(req);
    const services = await getServices(setup);
    const { server } = core.http;

    // Store telemetry data derived from services
    const agentNames = services.items.map(
      ({ agentName }) => agentName as AgentName
    );
    const apmTelemetry = createApmTelementry(agentNames);
    storeApmTelemetry(server, apmTelemetry);

    return services;
  }
}));

export const serviceAgentNameRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/agent_name',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: rangeRt
  },
  handler: async (req, { path }) => {
    const setup = await setupRequest(req);
    const { serviceName } = path;
    return getServiceAgentName(serviceName, setup);
  }
}));

export const serviceTransactionTypesRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/transaction_types',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: rangeRt
  },
  handler: async (req, { path }) => {
    const setup = await setupRequest(req);
    const { serviceName } = path;
    return getServiceTransactionTypes(serviceName, setup);
  }
}));
