/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { InternalCoreSetup } from 'src/core/server';
import { AgentName } from '../../typings/es_schemas/ui/fields/Agent';
import { createApmTelementry, storeApmTelemetry } from '../lib/apm_telemetry';
import { withDefaultValidators } from '../lib/helpers/input_validation';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceAgentName } from '../lib/services/get_service_agent_name';
import { getServices } from '../lib/services/get_services';
import { getServiceTransactionTypes } from '../lib/services/get_service_transaction_types';

const ROOT = '/api/apm/services';
const defaultErrorHandler = (err: Error) => {
  // eslint-disable-next-line
  console.error(err.stack);
  throw Boom.boomify(err, { statusCode: 400 });
};

export function initServicesApi(core: InternalCoreSetup) {
  const { server } = core.http;
  server.route({
    method: 'GET',
    path: ROOT,
    options: {
      validate: {
        query: withDefaultValidators()
      },
      tags: ['access:apm']
    },
    handler: async req => {
      const setup = setupRequest(req);
      const services = await getServices(setup).catch(defaultErrorHandler);

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
    path: `${ROOT}/{serviceName}/agent_name`,
    options: {
      validate: {
        query: withDefaultValidators()
      },
      tags: ['access:apm']
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName } = req.params;
      return getServiceAgentName(serviceName, setup).catch(defaultErrorHandler);
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/{serviceName}/transaction_types`,
    options: {
      validate: {
        query: withDefaultValidators()
      },
      tags: ['access:apm']
    },
    handler: req => {
      const setup = setupRequest(req);
      const { serviceName } = req.params;
      return getServiceTransactionTypes(serviceName, setup).catch(
        defaultErrorHandler
      );
    }
  });
}
