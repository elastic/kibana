/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ServerRouteRepository,
  parseEndpoint,
  passThroughValidationObject,
  decodeRequestParams,
  stripNullishRequestParameters,
  IoTsParamsObject,
} from '@kbn/server-route-repository';
import type {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandlerContext,
  RouteRegistrar,
} from '@kbn/core/server';
import { lastValueFrom } from 'rxjs';
import { errors } from '@elastic/elasticsearch';
import { isBoom } from '@hapi/boom';
import type { VersionedRouteRegistrar } from '@kbn/core-http-server';
import type { APMSourcesRouteHandlerResources } from './routes/settings';

const CLIENT_CLOSED_REQUEST = {
  statusCode: 499,
  body: {
    message: 'Client closed request',
  },
};

export const registerRoutes = ({
  core,
  repository,
  logger,
  plugin,
  kibanaVersion,
}: {
  core: APMSourcesRouteHandlerResources['core'];
  logger: APMSourcesRouteHandlerResources['logger'];
  plugin: APMSourcesRouteHandlerResources['plugin'];
  repository: ServerRouteRepository;
  kibanaVersion: string;
}) => {
  const router = core.setup.http.createRouter();

  for (const route of Object.values(repository)) {
    const { endpoint, handler, security } = route;
    const { method, pathname, version } = parseEndpoint(endpoint);

    const params = 'params' in route ? route.params : undefined;

    const wrappedHandler = async (
      context: RequestHandlerContext,
      request: KibanaRequest,
      response: KibanaResponseFactory
    ) => {
      try {
        const validatedParams =
          params &&
          decodeRequestParams(
            stripNullishRequestParameters({
              params: request.params,
              body: request.body,
              query: request.query,
            }),
            params as IoTsParamsObject
          );

        const { aborted, data } = await Promise.race([
          handler({
            request,
            context,
            logger,
            core,
            plugin,
            params: validatedParams,
            kibanaVersion,
          }).then(
            (
              value: Record<string, any> | undefined
            ): { aborted: false; data: Record<string, any> | undefined } => ({
              aborted: false,
              data: value,
            })
          ),
          lastValueFrom(request.events.aborted$).then((): { aborted: true; data: undefined } => ({
            aborted: true,
            data: undefined,
          })),
        ]);

        if (aborted) {
          return response.custom(CLIENT_CLOSED_REQUEST);
        }

        if (Array.isArray(data)) {
          throw new TypeError('Return type cannot be an array');
        }

        return response.ok({ body: data });
      } catch (error) {
        const opts = {
          statusCode: 500,
          body: {
            message: error.message,
            attributes: {
              data: {},
            },
          },
        };

        if (error instanceof errors.RequestAbortedError) {
          opts.statusCode = CLIENT_CLOSED_REQUEST.statusCode;
          opts.body.message = CLIENT_CLOSED_REQUEST.body.message;

          return response.custom(opts);
        }

        if (isBoom(error)) {
          opts.statusCode = error.output.statusCode;
          opts.body.attributes.data = { ...error?.data };
        }

        return response.custom(opts);
      }
    };

    if (!version) {
      (router[method] as RouteRegistrar<typeof method, RequestHandlerContext>)(
        {
          path: pathname,
          options: {},
          security,
          validate: passThroughValidationObject,
        },
        wrappedHandler
      );
    } else {
      (router.versioned[method] as VersionedRouteRegistrar<typeof method, RequestHandlerContext>)({
        path: pathname,
        access: pathname.includes('/internal/apm') ? 'internal' : 'public',
        options: {},
        security,
      }).addVersion(
        {
          version,
          validate: {
            request: passThroughValidationObject,
          },
        },
        wrappedHandler
      );
    }
  }
};
