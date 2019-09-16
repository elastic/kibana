/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { throwErrors } from '../../../common/runtime_types';
import { InfraBackendLibs } from '../../lib/infra_types';
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
        const { timeRange, nodeId, nodeType, sourceId } = pipe(
          InfraApmMetricsRequestRT.decode(req.payload),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const { configuration } = await sources.getSourceConfiguration(req, sourceId);
        const services = await getApmServices(req, configuration, nodeId, nodeType, timeRange);
        const servicesWithData = await Promise.all(
          services.map(service =>
            getApmServiceData(req, configuration, service, nodeId, nodeType, timeRange)
          )
        );
        return pipe(
          InfraApmMetricsRT.decode({
            id: 'apmMetrics',
            services: servicesWithData,
          }),
          fold(throwErrors(Boom.badImplementation), identity)
        );
      } catch (error) {
        if (error instanceof Error) {
          throw Boom.boomify(error);
        }
        throw Boom.badImplementation('Recieved a non Error object.');
      }
    },
  });
};
