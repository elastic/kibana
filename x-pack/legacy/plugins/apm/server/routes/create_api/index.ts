/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { merge, pick, omit, difference } from 'lodash';
import Boom from '@hapi/boom';
import { InternalCoreSetup } from 'src/core/server';
import { Request, ResponseToolkit } from '@hapi/hapi';
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isLeft } from 'fp-ts/lib/Either';
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
    init(core: InternalCoreSetup) {
      const { server } = core.http;
      factoryFns.forEach(fn => {
        const { params = {}, ...route } = fn(core) as Route<
          string,
          HttpMethod,
          Params,
          any
        >;

        const bodyRt = params.body;
        const fallbackBodyRt = bodyRt || t.null;

        const rts = {
          // add _debug query parameter to all routes
          query: params.query
            ? t.exact(t.intersection([params.query, debugRt]))
            : t.exact(debugRt),
          path: params.path ? t.exact(params.path) : t.strict({}),
          body: bodyRt && 'props' in bodyRt ? t.exact(bodyRt) : fallbackBodyRt
        };

        server.route(
          merge(
            {
              options: {
                tags: ['access:apm']
              },
              method: 'GET'
            },
            route,
            {
              handler: (request: Request, h: ResponseToolkit) => {
                const paramMap = {
                  path: request.params,
                  body: request.payload,
                  query: request.query
                };

                const parsedParams = (Object.keys(rts) as Array<
                  keyof typeof rts
                >).reduce(
                  (acc, key) => {
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

                    // hide _debug from route handlers
                    const parsedValue =
                      key === 'query'
                        ? omit(result.right, '_debug')
                        : result.right;

                    return {
                      ...acc,
                      [key]: parsedValue
                    };
                  },
                  {} as Record<keyof typeof params, any>
                );

                return route.handler(
                  request,
                  // only return values for parameters that have runtime types
                  pick(parsedParams, Object.keys(params)),
                  h
                );
              }
            }
          )
        );
      });
    }
  };

  return api;
}
