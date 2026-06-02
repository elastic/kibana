/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import { isResponseError } from '@kbn/es-errors';
import Boom from '@hapi/boom';
import type { CoreSetup, Logger, RouteRegistrar, RouteSecurity } from '@kbn/core/server';
import type { IoTsParamsObject, ServerRouteRepository } from '@kbn/server-route-repository';
import {
  decodeRequestParams,
  stripNullishRequestParameters,
  parseEndpoint,
  passThroughValidationObject,
} from '@kbn/server-route-repository';
import * as t from 'io-ts';
import type { DatasetQualityRequestHandlerContext } from '../types';
import type { DatasetQualityRouteHandlerResources } from './types';

interface RegisterRoutes {
  core: CoreSetup;
  repository: ServerRouteRepository;
  logger: Logger;
  plugins: DatasetQualityRouteHandlerResources['plugins'];
  getEsCapabilities: DatasetQualityRouteHandlerResources['getEsCapabilities'];
  getIsSecurityEnabled: DatasetQualityRouteHandlerResources['getIsSecurityEnabled'];
}

export function registerRoutes({
  repository,
  core,
  logger,
  plugins,
  getEsCapabilities,
  getIsSecurityEnabled,
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

          const data = await handler({
            context,
            request,
            logger,
            params: decodedParams,
            plugins,
            getEsCapabilities,
            getIsSecurityEnabled,
          });

          if (data === undefined) {
            return response.noContent();
          }

          return response.ok({ body: data });
        } catch (error) {
          if (Boom.isBoom(error)) {
            logRouteError(logger, {
              statusCode: error.output.statusCode,
              message: error.output.payload.message,
              cause: error,
            });
            return response.customError({
              statusCode: error.output.statusCode,
              body: { message: error.output.payload.message },
            });
          }

          let statusCode = 500;
          let message: string = error.message;

          if (error instanceof errors.RequestAbortedError) {
            statusCode = 499;
            message = 'Client closed request';
          } else if (isResponseError(error)) {
            statusCode = error.statusCode ?? 500;
            message =
              extractEsReason(error.body) ?? `Elasticsearch responded with status ${statusCode}`;
          }

          logRouteError(logger, { statusCode, message, cause: error });

          return response.customError({ statusCode, body: { message } });
        }
      }
    );
  });
}

interface EsErrorBody {
  error?: {
    reason?: string;
    caused_by?: { reason?: string };
    root_cause?: Array<{ reason?: string }>;
  };
}

function extractEsReason(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const error = (body as EsErrorBody).error;
  return error?.reason ?? error?.caused_by?.reason ?? error?.root_cause?.[0]?.reason;
}

function logRouteError(
  logger: Logger,
  failure: { statusCode: number; message: string; cause?: Error }
) {
  const { statusCode, message, cause } = failure;

  if (statusCode >= 500) {
    // Forward the Error so BaseLogger emits ECS error.stack_trace / error.type.
    logger.error(cause ?? message);
  } else if (statusCode === 429) {
    // Capacity / circuit-breaker signal
    logger.warn(cause ?? message);
  } else {
    logger.debug(message);
  }
}
