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
import { KibanaResponseFactory, RouteRegistrar } from 'src/core/server';
import { APMConfig } from '../../../../../../plugins/apm/server';
import {
  ServerAPI,
  RouteFactoryFn,
  HttpMethod,
  Route,
  Params
} from '../typings';
import { jsonRt } from '../../../common/runtime_types/json_rt';

const debugRt = t.partial({ _debug: jsonRt.pipe(t.boolean) });

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

        // For all runtime types with props, we create an exact
        // version that will strip all keys that are unvalidated.

        const bodyRt =
          params.body && 'props' in params.body
            ? t.exact(params.body)
            : params.body;

        const rts = {
          // Add _debug query parameter to all routes
          query: params.query
            ? t.exact(t.intersection([params.query, debugRt]))
            : t.exact(debugRt),
          path: params.path ? t.exact(params.path) : t.strict({}),
          body: bodyRt || t.null
        };

        const anyObject = schema.object({}, { allowUnknowns: true });

        (router[routerMethod] as RouteRegistrar<typeof routerMethod>)(
          {
            path,
            options,
            validate: {
              // `body` can be null, but `validate` expects non-nullable types
              // if any validation is defined. Not having validation currently
              // means we don't get the payload. See
              // https://github.com/elastic/kibana/issues/50179
              body: schema.nullable(anyObject),
              params: anyObject,
              query: anyObject
            }
          },
          async (context, request, response) => {
            try {
              const paramMap = {
                path: request.params,
                body: request.body,
                query: {
                  _debug: 'false',
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

                // `io-ts` has stripped unvalidated keys, so we can compare
                // the output with the input to see if all object keys are
                // known and validated.
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
                  // Only return values for parameters that have runtime types,
                  // but always include query as _debug is always set even if
                  // it's not defined in the route.
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
