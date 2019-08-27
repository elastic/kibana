/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { merge, pick, omit } from 'lodash';
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
import { jsonRt } from '../../../common/runtime_types/json_rt';

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

        const rts = {
          // add _debug query parameter to all routes
          query: params.query
            ? t.exact(
                t.intersection([
                  params.query,
                  t.partial({ _debug: jsonRt.pipe(t.boolean) })
                ])
              )
            : t.union([
                t.strict({}),
                t.strict({ _debug: jsonRt.pipe(t.boolean) })
              ]),
          path: params.path || t.strict({}),
          body: params.body || t.null
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
                    let codec = rts[key];
                    const value = paramMap[key];

                    // Use exact props where possible (only possible for types with props)
                    if ('props' in codec) {
                      codec = t.exact(codec);
                    }

                    const result = codec.decode(value);

                    if (result.isLeft()) {
                      throw Boom.badRequest(PathReporter.report(result)[0]);
                    }

                    // hide _debug from route handlers
                    const parsedValue =
                      key === 'query'
                        ? omit(result.value, '_debug')
                        : result.value;

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
