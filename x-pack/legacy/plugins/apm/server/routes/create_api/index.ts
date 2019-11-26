/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { pick, difference } from 'lodash';
import Boom from 'boom';
import { schema } from '@kbn/config-schema';
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isLeft } from 'fp-ts/lib/Either';
import { KibanaResponseFactory } from 'src/core/server';
import { APMConfig } from '../../../../../../plugins/apm/server';
import {
  ServerAPI,
  RouteFactoryFn,
  HttpMethod,
  Route,
  Params
} from '../typings';

const debugRt = t.partial({ _debug: t.boolean });

export function createApi() {
  const factoryFns: Array<RouteFactoryFn<any, any, any, any>> = [];
  const api: ServerAPI<{}> = {
    _S: {},
    add(fn) {
      factoryFns.push(fn);
      return this as any;
    },
    init(core, { config$, logger, __LEGACY }) {
      const router = core.http.createRouter();

      let config = {} as APMConfig;

      config$.subscribe(val => {
        config = val;
      });

      factoryFns.forEach(fn => {
        const {
          params = {},
          path,
          options = { tags: ['access:apm'] },
          method,
          handler
        } = fn(core) as Route<string, HttpMethod, Params, any>;

        const routerMethod = (method || 'GET').toLowerCase() as
          | 'post'
          | 'put'
          | 'get'
          | 'delete';

        const bodyRt = params.body;
        const fallbackBodyRt = bodyRt || t.strict({});

        const rts = {
          // add _debug query parameter to all routes
          query: params.query
            ? t.exact(t.intersection([params.query, debugRt]))
            : t.exact(debugRt),
          path: params.path ? t.exact(params.path) : t.strict({}),
          body: bodyRt && 'props' in bodyRt ? t.exact(bodyRt) : fallbackBodyRt
        };

        router[routerMethod](
          {
            path,
            options,
            validate: {
              ...(routerMethod === 'get'
                ? {}
                : { body: schema.object({}, { allowUnknowns: true }) }),
              params: schema.object({}, { allowUnknowns: true }),
              query: schema.object({}, { allowUnknowns: true })
            }
          },
          async (context, request, response) => {
            try {
              const paramMap = {
                path: request.params,
                body: request.body,
                query: {
                  _debug: false,
                  ...request.query
                }
              };

              const parsedParams = (Object.keys(rts) as Array<
                keyof typeof rts
              >).reduce((acc, key) => {
                const codec = rts[key];
                const value = paramMap[key];

                const result = codec.decode(value);

                if (isLeft(result)) {
                  throw Boom.badRequest(PathReporter.report(result)[0]);
                }

                const strippedKeys = difference(
                  Object.keys(value || {}),
                  Object.keys(result.right || {})
                );

                if (strippedKeys.length) {
                  throw Boom.badRequest(
                    `Unknown keys specified: ${strippedKeys}`
                  );
                }

                const parsedValue = result.right;

                return {
                  ...acc,
                  [key]: parsedValue
                };
              }, {} as Record<keyof typeof params, any>);

              const data = await handler({
                request,
                context: {
                  ...context,
                  __LEGACY,
                  // only return values for parameters that have runtime types
                  params: pick(parsedParams, ...Object.keys(params), 'query'),
                  config,
                  logger
                }
              });

              return response.ok({ body: data });
            } catch (error) {
              if (Boom.isBoom(error)) {
                return convertBoomToKibanaResponse(error, response);
              }
              throw error;
            }
          }
        );
      });
    }
  };

  return api;
}

function convertBoomToKibanaResponse(
  error: Boom,
  response: KibanaResponseFactory
) {
  const opts = { body: error.message };
  switch (error.output.statusCode) {
    case 404:
      return response.notFound(opts);

    case 400:
      return response.badRequest(opts);

    case 403:
      return response.forbidden(opts);

    default:
      return response.custom({
        statusCode: error.output.statusCode,
        ...opts
      });
  }
}
