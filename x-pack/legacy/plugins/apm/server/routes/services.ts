/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import Boom from 'boom';
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
import { getServiceMap } from '../lib/service_map/get_service_map';
import { getServiceAnnotations } from '../lib/services/annotations';

export const servicesRoute = createRoute(() => ({
  path: '/api/apm/services',
  params: {
    query: t.intersection([uiFiltersRt, rangeRt])
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const services = await getServices(setup);

    // Store telemetry data derived from services
    const agentNames = services.items.map(
      ({ agentName }) => agentName as AgentName
    );
    const apmTelemetry = createApmTelementry(agentNames);
    storeApmServicesTelemetry(context.__LEGACY.server, apmTelemetry);

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
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
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
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
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
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName, serviceNodeName } = context.params.path;
    return getServiceNodeMetadata({ setup, serviceName, serviceNodeName });
  }
}));

export const serviceMapAllRoute = createRoute(() => ({
  path: '/api/apm/service-map/all',
  params: {
    query: t.intersection([
      t.partial({ environment: t.string }),
      uiFiltersRt,
      rangeRt
    ])
  },
  handler: async ({ context, request }) => {
    if (!context.config['xpack.apm.serviceMapEnabled']) {
      return new Boom('Not found', { statusCode: 404 });
    }
    const setup = await setupRequest(context, request);
    const {
      query: { environment }
    } = context.params;
    return getServiceMap({ setup, environment });
  }
}));

export const serviceMapRoute = createRoute(() => ({
  path: '/api/apm/service-map/{serviceName}',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      t.partial({ environment: t.string }),
      uiFiltersRt,
      rangeRt
    ])
  },
  handler: async ({ context, request }) => {
    if (!context.config['xpack.apm.serviceMapEnabled']) {
      return new Boom('Not found', { statusCode: 404 });
    }
    const setup = await setupRequest(context, request);
    const {
      path: { serviceName },
      query: { environment }
    } = context.params;
    return getServiceMap({ setup, serviceName, environment });
  }
}));

export const serviceAnnotationsRoute = createRoute(() => ({
  path: '/api/apm/services/{serviceName}/annotations',
  params: {
    path: t.type({
      serviceName: t.string
    }),
    query: t.intersection([
      rangeRt,
      t.partial({
        environment: t.string
      })
    ])
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { environment } = context.params.query;

    return getServiceAnnotations({
      setup,
      serviceName,
      environment
    });
  }
}));
