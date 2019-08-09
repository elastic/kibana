/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as GraphiQL from 'apollo-server-module-graphiql';
import Boom from 'boom';
import { Plugin, Request, ResponseToolkit, RouteOptions, Server } from 'hapi';

import { GraphQLOptions, runHttpQuery } from 'apollo-server-core';

export type HapiOptionsFunction = (req: Request) => GraphQLOptions | Promise<GraphQLOptions>;

export interface HapiGraphQLPluginOptions {
  path: string;
  vhost?: string;
  route?: RouteOptions;
  graphqlOptions: GraphQLOptions | HapiOptionsFunction;
}

export const graphqlHapi: Plugin<HapiGraphQLPluginOptions> = {
  name: 'graphql-siem',
  register: (server: Server, options: HapiGraphQLPluginOptions) => {
    if (!options || !options.graphqlOptions) {
      throw new Error('Apollo Server requires options.');
    }

    server.route({
      options: options.route || {},
      handler: async (request: Request, h: ResponseToolkit) => {
        try {
          const query =
            request.method === 'post'
              ? (request.payload as Record<string, any>) // eslint-disable-line @typescript-eslint/no-explicit-any
              : (request.query as Record<string, any>); // eslint-disable-line @typescript-eslint/no-explicit-any

          const gqlResponse = await runHttpQuery([request], {
            method: request.method.toUpperCase(),
            options: options.graphqlOptions,
            query,
          });

          return h.response(gqlResponse).type('application/json');
        } catch (error) {
          if ('HttpQueryError' !== error.name) {
            const queryError = Boom.boomify(error);

            queryError.output.payload.message = error.message;

            return queryError;
          }

          if (error.isGraphQLError === true) {
            return h
              .response(error.message)
              .code(error.statusCode)
              .type('application/json');
          }

          const genericError = new Boom(error.message, { statusCode: error.statusCode });

          if (error.headers) {
            Object.keys(error.headers).forEach(header => {
              genericError.output.headers[header] = error.headers[header];
            });
          }

          // Boom hides the error when status code is 500

          genericError.output.payload.message = error.message;

          throw genericError;
        }
      },
      method: ['GET', 'POST'],
      path: options.path || '/graphql',
      vhost: options.vhost || undefined,
    });
  },
};

export type HapiGraphiQLOptionsFunction = (
  req?: Request
) => GraphiQL.GraphiQLData | Promise<GraphiQL.GraphiQLData>;

export interface HapiGraphiQLPluginOptions {
  path: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  route?: any;

  graphiqlOptions: GraphiQL.GraphiQLData | HapiGraphiQLOptionsFunction;
}

export const graphiqlHapi: Plugin<HapiGraphiQLPluginOptions> = {
  name: 'graphiql-siem',
  register: (server: Server, options: HapiGraphiQLPluginOptions) => {
    if (!options || !options.graphiqlOptions) {
      throw new Error('Apollo Server GraphiQL requires options.');
    }

    server.route({
      options: options.route || {},
      handler: async (request: Request, h: ResponseToolkit) => {
        const graphiqlString = await GraphiQL.resolveGraphiQLString(
          request.query,
          options.graphiqlOptions,
          request
        );

        return h.response(graphiqlString).type('text/html');
      },
      method: 'GET',
      path: options.path || '/graphiql',
    });
  },
};
