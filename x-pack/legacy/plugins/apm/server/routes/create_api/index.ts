/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { merge } from 'lodash';
import Boom from 'boom';
import { InternalCoreSetup } from 'src/core/server';
import { Request, ResponseToolkit } from 'hapi';
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import {
  ServerAPI,
  RouteFactoryFn,
  HttpMethod,
  Route,
  Params
} from '../typings';
import { debugRt } from '../default_api_types';

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

                const parsedParams = (Object.keys(params) as Array<
                  keyof typeof params
                >).reduce(
                  (acc, key) => {
                    let codec = params[key];
                    const value = paramMap[key];

                    if (!codec) return acc;

                    // Use exact props where possible (only possible for types with props)
                    if ('props' in codec) {
                      codec = t.exact(codec);
                    }

                    // add _debug query parameter to all routes
                    if (key === 'query') {
                      codec = t.intersection([codec, debugRt]);
                    }

                    const result = codec.decode(value);

                    if (result.isLeft()) {
                      throw Boom.badRequest(PathReporter.report(result)[0]);
                    }

                    return {
                      ...acc,
                      [key]: result.value
                    };
                  },
                  {} as Record<keyof typeof params, any>
                );

                return route.handler(request, parsedParams, h);
              }
            }
          )
        );
      });
    }
  };

  return api;
}
