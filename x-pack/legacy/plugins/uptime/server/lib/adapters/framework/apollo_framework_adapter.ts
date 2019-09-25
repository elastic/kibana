/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { runHttpQuery } from 'apollo-server-core';
import { Plugin, ResponseToolkit } from '@hapi/hapi';
import { Request, Server } from '@hapi/hapi';
import { DEFAULT_GRAPHQL_PATH } from '../../../graphql';
import { UMHapiGraphQLPluginOptions } from './adapter_types';

export const uptimeGraphQLHapiPlugin: Plugin<UMHapiGraphQLPluginOptions> = {
  name: 'uptimeGraphQL',
  register: (server: Server, options: UMHapiGraphQLPluginOptions) => {
    server.route({
      options: options.route,
      handler: async (request: Request, h: ResponseToolkit) => {
        try {
          const { method } = request;
          const query =
            method === 'post'
              ? (request.payload as Record<string, any>)
              : (request.query as Record<string, any>);

          const graphQLResponse = await runHttpQuery([request], {
            method: method.toUpperCase(),
            options: options.graphQLOptions,
            query,
          });

          return h.response(graphQLResponse).type('application/json');
        } catch (error) {
          if (error.isGraphQLError === true) {
            return h
              .response(error.message)
              .code(error.statusCode)
              .type('application/json');
          }
          return h.response(error).type('application/json');
        }
      },
      method: ['get', 'post'],
      path: options.path || DEFAULT_GRAPHQL_PATH,
      vhost: options.vhost || undefined,
    });
  },
};
