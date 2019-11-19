/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import { schema as kbnSchema } from '@kbn/config-schema';
import { runHttpQuery } from 'apollo-server-core';
import { ObjectType } from '@kbn/config-schema';
import { UptimeCorePlugins, UptimeCoreSetup } from './adapter_types';
import {
  UMBackendFrameworkAdapter,
  UMFrameworkRequest,
  UMFrameworkResponse,
  UMFrameworkRouteOptions,
} from './adapter_types';

export class UMKibanaBackendFrameworkAdapter implements UMBackendFrameworkAdapter {
  constructor(
    private readonly server: UptimeCoreSetup,
    private readonly plugins: UptimeCorePlugins
  ) {
    this.server = server;
    this.plugins = plugins;
  }

  public registerRoute<
    RouteRequest extends UMFrameworkRequest,
    RouteResponse extends UMFrameworkResponse
  >({
    handler,
    method,
    path,
    validate,
  }: UMFrameworkRouteOptions<ObjectType, ObjectType, ObjectType>) {
    switch (method) {
      case 'GET':
        this.server.route.get(
          {
            path,
            validate,
          },
          handler
        );
        break;
      default:
        throw new Error(`Handler for method ${method} is not defined`);
    }
  }

  public registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void {
    const options = {
      graphQLOptions: (req: any) => ({
        context: { req },
        schema,
      }),
      path: routePath,
      route: {
        tags: ['access:uptime'],
      },
    };
    this.server.route.post(
      {
        path: routePath,
        validate: {
          body: kbnSchema.object({
            operationName: kbnSchema.string(),
            query: kbnSchema.string(),
            variables: kbnSchema.recordOf(kbnSchema.string(), kbnSchema.any()),
          }),
        },
      },
      async (context, request, resp): Promise<any> => {
        try {
          const query = request.body as Record<string, any>;

          const graphQLResponse = await runHttpQuery([request], {
            method: 'POST',
            options: options.graphQLOptions,
            query,
          });

          return resp.ok({
            body: graphQLResponse,
            headers: {
              'content-type': 'application/json',
            },
          });
        } catch (error) {
          if (error.isGraphQLError === true) {
            return resp.internalError({
              body: { message: error.message },
              headers: { 'content-type': 'application/json' },
            });
          }
          return resp.internalError();
        }
      }
    );
  }

  public getSavedObjectsClient() {
    const { elasticsearch, savedObjects } = this.plugins;
    const { SavedObjectsClient, getSavedObjectsRepository } = savedObjects;
    const { callWithInternalUser } = elasticsearch.getCluster('admin');
    const internalRepository = getSavedObjectsRepository(callWithInternalUser);
    return new SavedObjectsClient(internalRepository);
  }
}
