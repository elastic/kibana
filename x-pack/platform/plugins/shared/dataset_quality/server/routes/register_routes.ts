/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { CoreSetup, Logger, RouteRegistrar, RouteSecurity } from '@kbn/core/server';
import {
  IoTsParamsObject,
  ServerRouteRepository,
  decodeRequestParams,
  stripNullishRequestParameters,
  parseEndpoint,
  passThroughValidationObject,
} from '@kbn/server-route-repository';
import * as t from 'io-ts';
import { DatasetQualityRequestHandlerContext } from '../types';
import { DatasetQualityRouteHandlerResources } from './types';

interface RegisterRoutes {
  core: CoreSetup;
  repository: ServerRouteRepository;
  logger: Logger;
  plugins: DatasetQualityRouteHandlerResources['plugins'];
  getEsCapabilities: DatasetQualityRouteHandlerResources['getEsCapabilities'];
}

export function registerRoutes({
  repository,
  core,
  logger,
  plugins,
  getEsCapabilities,
}: RegisterRoutes) {
  const routes = Object.values(repository);

  const router = core.http.createRouter();

  routes.forEach((route) => {
    const { endpoint, handler } = route;
    const { pathname, method } = parseEndpoint(endpoint);

    const params = 'params' in route ? route.params : undefined;
    const options = 'options' in route ? route.options : {};

    (router[method] as RouteRegistrar<typeof method, DatasetQualityRequestHandlerContext>)(
      {
        path: pathname,
        validate: passThroughValidationObject,
        options,
        security: route.security as RouteSecurity,
      },
      async (context, request, response) => {
        try {
          const decodedParams = decodeRequestParams(
            stripNullishRequestParameters({
              params: request.params,
              body: request.body,
              query: request.query,
            }),
            (params as IoTsParamsObject) ?? t.strict({})
          );

          const data = (await handler({
            context,
            request,
            logger,
            params: decodedParams,
            plugins,
            getEsCapabilities,
          })) as any;

          if (data === undefined) {
            return response.noContent();
          }

          return response.ok({ body: data });
        } catch (error) {
          if (Boom.isBoom(error)) {
            logRouteError(logger, error);
            return response.customError({
              statusCode: error.output.statusCode,
              body: { message: error.output.payload.message },
            });
          }

          const opts = {
            statusCode: 500,
            body: {
              message: error.message,
            },
          };

          if (error instanceof errors.RequestAbortedError) {
            opts.statusCode = 499;
            opts.body.message = 'Client closed request';
          }

          logRouteError(logger, opts);

          return response.customError(opts);
        }
      }
    );
  });
}

function logRouteError(
  logger: Logger,
  error: { statusCode: number; body: { message: string } } | Boom.Boom
) {
  const errorStatusCode = 'statusCode' in error ? error.statusCode : error.output.statusCode;
  const errorMessage = Boom.isBoom(error) ? error.output.payload.message : error.body.message;

  if (errorStatusCode >= 500) {
    logger.error(errorMessage);
  } else {
    logger.debug(errorMessage);
  }
}
