/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { InfraBackendLibs } from '../../lib/infra_types';
import { throwErrors } from '../../../common/runtime_types';
import {
  InfraApmMetricsRequestRT,
  InfraApmMetricsRequestWrapped,
  InfraApmMetrics,
  InfraApmMetricsRT,
} from '../../../common/http_api';
import { getApmServices } from './lib/get_apm_services';
import { getApmServiceData } from './lib/get_apm_service_data';

export const initApmMetricsRoute = (libs: InfraBackendLibs) => {
  const { framework, sources } = libs;

  framework.registerRoute<InfraApmMetricsRequestWrapped, Promise<InfraApmMetrics>>({
    method: 'POST',
    path: '/api/infra/apm_metrics',
    handler: async req => {
      try {
        const { timeRange, nodeId, nodeType, sourceId } = InfraApmMetricsRequestRT.decode(
          req.payload
        ).getOrElseL(throwErrors(Boom.badRequest));
        const { configuration } = await sources.getSourceConfiguration(req, sourceId);
        const serviceNames = await getApmServices(
          framework,
          req,
          configuration,
          nodeId,
          nodeType,
          timeRange
        );
        const services = await Promise.all(
          serviceNames.map(name =>
            getApmServiceData(framework, req, configuration, name, nodeId, nodeType, timeRange)
          )
        );
        return InfraApmMetricsRT.decode({ services }).getOrElseL(
          throwErrors(Boom.badImplementation)
        );
      } catch (error) {
        throw Boom.boomify(error);
      }
    },
  });
};
