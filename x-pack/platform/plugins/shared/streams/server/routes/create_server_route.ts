/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerRouteFactory } from '@kbn/server-route-repository';
import { CreateServerRouteFactory } from '@kbn/server-route-repository-utils/src/typings';
import { badRequest, conflict, forbidden, internal, notFound } from '@hapi/boom';
import { errors } from '@elastic/elasticsearch';
import { get } from 'lodash';
import { StreamsRouteHandlerResources } from './types';
import { StatusError } from '../lib/streams/errors/status_error';
import { AggregateStatusError } from '../lib/streams/errors/aggregate_status_error';

const createPlainStreamsServerRoute = createServerRouteFactory<StreamsRouteHandlerResources>();

export const createServerRoute: CreateServerRouteFactory<
  StreamsRouteHandlerResources,
  undefined
> = ({ handler, ...config }) => {
  return createPlainStreamsServerRoute({
    ...config,
    options: {
      ...config.options,
      tags: [...(config.options?.tags ?? []), 'oas-tag:streams'],
    },
    handler: (options) => {
      const { telemetry } = options;
      const finishTracking = telemetry.startTrackingEndpointLatency({
        name: get(options, 'params.path.name', '__all__'),
        endpoint: config.endpoint,
      });
      return handler(options)
        .catch((error) => {
          if (
            error instanceof StatusError ||
            error instanceof AggregateStatusError ||
            error instanceof errors.ResponseError
          ) {
            switch (error.statusCode) {
              case 400:
                throw badRequest(error, 'data' in error ? error.data : undefined);

              case 403:
                throw forbidden(error, 'data' in error ? error.data : undefined);

              case 404:
                throw notFound(error, 'data' in error ? error.data : undefined);

              case 409:
                throw conflict(error, 'data' in error ? error.data : undefined);

              case 500:
                throw internal(error, 'data' in error ? error.data : undefined);
            }
          }
          throw error;
        })
        .finally(finishTracking);
    },
  });
};
