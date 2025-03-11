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
import { StreamsRouteHandlerResources } from './types';
import { StatusError } from '../lib/streams/errors/status_error';

const createPlainStreamsServerRoute = createServerRouteFactory<StreamsRouteHandlerResources>();

export const createServerRoute: CreateServerRouteFactory<
  StreamsRouteHandlerResources,
  undefined
> = ({ handler, ...config }) => {
  return createPlainStreamsServerRoute({
    ...config,
    handler: (options) => {
      return handler(options).catch((error) => {
        if (error instanceof StatusError || error instanceof errors.ResponseError) {
          switch (error.statusCode) {
            case 400:
              throw badRequest(error);

            case 403:
              throw forbidden(error);

            case 404:
              throw notFound(error);

            case 409:
              throw conflict(error);

            case 500:
              throw internal(error);
          }
        }
        throw error;
      });
    },
  });
};
