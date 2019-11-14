/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { AgentName } from '../../typings/es_schemas/ui/fields/Agent';
import {
  createApmTelementry,
  storeApmServicesTelemetry
} from '../lib/apm_telemetry';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceAgentName } from '../lib/services/get_service_agent_name';
import { getServices } from '../lib/services/get_services';
import { getServiceTransactionTypes } from '../lib/services/get_service_transaction_types';
import { getServiceNodeMetadata } from '../lib/services/get_service_node_metadata';
import { createRoute } from './create_route';
import { uiFiltersRt, rangeRt } from './default_api_types';
import { getServiceMap } from '../lib/services/map';

export const servicesRoute = createRoute((core, { server }) => ({
  path: '/api/apm/services',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt])
  },
  handler: async req => {
    const setup = await setupRequest(req);
    const services = await getServices(setup);

    // Store telemetry data derived from services
    const agentNames = services.items.map(
      ({ agentName }) => agentName as AgentName
    );
    const apmTelemetry = createApmTelementry(agentNames);
    storeApmServicesTelemetry(server, apmTelemetry);

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

export const serviceNodeMetadataRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/node/{serviceNodeName}/metadata',
  params: {
    path: t.type({
      serviceName: t.string,
      serviceNodeName: t.string
    }),
    query: t.intersection([uiFiltersRt, rangeRt])
  },
  handler: async (req, { path }) => {
    const setup = await setupRequest(req);
    const { serviceName, serviceNodeName } = path;
    return getServiceNodeMetadata({ setup, serviceName, serviceNodeName });
  }
}));

export const serviceMapRoute = createRoute(() => ({
  path: '/api/apm/service-map',
  params: {
    query: rangeRt
  },
  handler: async (request, _response, hapi) => {
    const setup = await setupRequest(request);
    if (setup.config.get('xpack.apm.serviceMapEnabled')) {
      return getServiceMap();
    } else {
      return hapi.response().code(404);
    }
  }
}));
