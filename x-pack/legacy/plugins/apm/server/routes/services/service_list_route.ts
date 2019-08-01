/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AgentName } from '../../../typings/es_schemas/ui/fields/Agent';
import {
  createApmTelementry,
  storeApmTelemetry
} from '../../lib/apm_telemetry';
import { getServices } from '../../lib/services/get_services';
import { withDefaultQueryParamValidators } from '../../lib/helpers/input_validation';
import {
  DefaultQueryParams,
  APMRequest,
  setupRequest
} from '../../lib/helpers/setup_request';
import { PromiseReturnType } from '../../../typings/common';

export type ServiceListAPIResponse = PromiseReturnType<
  typeof serviceListRoute['handler']
>;
export const serviceListRoute = {
  method: 'GET',
  path: '/api/apm/services',
  options: {
    validate: {
      query: withDefaultQueryParamValidators()
    },
    tags: ['access:apm']
  },
  handler: async (req: APMRequest<DefaultQueryParams>) => {
    const setup = await setupRequest(req);
    const services = await getServices(setup);

    // Store telemetry data derived from services
    const agentNames = services.items.map(
      ({ agentName }) => agentName as AgentName
    );
    const apmTelemetry = createApmTelementry(agentNames);
    storeApmTelemetry(req.server, apmTelemetry);

    return services;
  }
};
