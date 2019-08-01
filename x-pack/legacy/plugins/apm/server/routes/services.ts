/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InternalCoreSetup } from 'src/core/server';
import { AgentName } from '../../typings/es_schemas/ui/fields/Agent';
import { createApmTelementry, storeApmTelemetry } from '../lib/apm_telemetry';
import { withDefaultQueryParamValidators } from '../lib/helpers/input_validation';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceAgentName } from '../lib/services/get_service_agent_name';
import { getServices } from '../lib/services/get_services';
import { getServiceTransactionTypes } from '../lib/services/get_service_transaction_types';

export function initServicesApi(core: InternalCoreSetup) {
  const { server } = core.http;
  server.route({
    method: 'GET',
    path: '/api/apm/services',
    options: {
      validate: {
        query: withDefaultQueryParamValidators()
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const setup = await setupRequest(req);
      const services = await getServices(setup);

      // Store telemetry data derived from services
      const agentNames = services.items.map(
        ({ agentName }) => agentName as AgentName
      );
      const apmTelemetry = createApmTelementry(agentNames);
      storeApmTelemetry(server, apmTelemetry);

      return services;
    }
  });

  server.route({
    method: 'GET',
    path: `/api/apm/services/{serviceName}/agent_name`,
    options: {
      validate: {
        query: withDefaultQueryParamValidators()
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const setup = await setupRequest(req);
      const { serviceName } = req.params;
      return getServiceAgentName(serviceName, setup);
    }
  });

  server.route({
    method: 'GET',
    path: `/api/apm/services/{serviceName}/transaction_types`,
    options: {
      validate: {
        query: withDefaultQueryParamValidators()
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const setup = await setupRequest(req);
      const { serviceName } = req.params;
      return getServiceTransactionTypes(serviceName, setup);
    }
  });
}
