/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerRouteFactory } from '@kbn/server-route-repository';
import type { CreateServerRouteFactory } from '@kbn/server-route-repository-utils/src/typings';
import { badRequest, conflict, forbidden, internal, notFound } from '@hapi/boom';
import { errors } from '@elastic/elasticsearch';
import type { SignificantEventsRouteHandlerResources } from './types';
import { StatusError } from '../lib/errors/status_error';

const createPlainSignificantEventsServerRoute =
  createServerRouteFactory<SignificantEventsRouteHandlerResources>();

export const createServerRoute: CreateServerRouteFactory<
  SignificantEventsRouteHandlerResources,
  undefined
> = ({ handler, ...config }) => {
  return createPlainSignificantEventsServerRoute({
    ...config,
    options: {
      ...config.options,
      tags: [...(config.options?.tags ?? []), 'oas-tag:significant_events'],
    },
    handler: (options) => {
      return handler(options).catch((error) => {
        if (error instanceof StatusError) {
          switch (error.statusCode) {
            case 400:
              throw badRequest(error.message);
            case 403:
              throw forbidden(error.message);
            case 404:
              throw notFound(error.message);
            case 409:
              throw conflict(error.message);
            default:
              throw internal(error.message);
          }
        }

        if (error instanceof errors.ResponseError) {
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
      });
    },
  });
};
