/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as GraphiQL from 'apollo-server-module-graphiql';
import { GraphQLSchema } from 'graphql';
import { runHttpQuery } from 'apollo-server-core';
import { schema as configSchema } from '@kbn/config-schema';
import {
  CoreSetup,
  IRouter,
  KibanaResponseFactory,
  RequestHandlerContext,
  PluginInitializerContext,
  KibanaRequest,
} from '../../../../../../../src/core/server';
import { IndexPatternsFetcher } from '../../../../../../../src/plugins/data/server';
import { AuthenticatedUser } from '../../../../../../plugins/security/common/model';
import { RequestFacade } from '../../types';

import {
  FrameworkAdapter,
  FrameworkIndexPatternsService,
  FrameworkRequest,
  internalFrameworkRequest,
  WrappableRequest,
} from './types';
import { SiemPluginSecurity, PluginsSetup } from '../../plugin';

export class KibanaBackendFrameworkAdapter implements FrameworkAdapter {
  public version: string;
  private isProductionMode: boolean;
  private router: IRouter;
  private security: SiemPluginSecurity;

  constructor(core: CoreSetup, plugins: PluginsSetup, env: PluginInitializerContext['env']) {
    this.version = env.packageInfo.version;
    this.isProductionMode = env.mode.prod;
    this.router = core.http.createRouter();
    this.security = plugins.security;
  }

  public async callWithRequest(
    req: FrameworkRequest,
    endpoint: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: Record<string, any>
  ) {
    const { elasticsearch, uiSettings } = req.context.core;
    const includeFrozen = await uiSettings.client.get('search:includeFrozen');
    const maxConcurrentShardRequests =
      endpoint === 'msearch'
        ? await uiSettings.client.get('courier:maxConcurrentShardRequests')
        : 0;

    return elasticsearch.dataClient.callAsCurrentUser(endpoint, {
      ...params,
      ignore_throttled: !includeFrozen,
      ...(maxConcurrentShardRequests > 0
        ? { max_concurrent_shard_requests: maxConcurrentShardRequests }
        : {}),
    });
  }

  public registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void {
    this.router.post(
      {
        path: routePath,
        validate: {
          body: configSchema.object({
            operationName: configSchema.string(),
            query: configSchema.string(),
            variables: configSchema.object({}, { allowUnknowns: true }),
          }),
        },
        options: {
          tags: ['access:siem'],
        },
      },
      async (context, request, response) => {
        try {
          const user = await this.getCurrentUserInfo(request);
          const gqlResponse = await runHttpQuery([request], {
            method: 'POST',
            options: (req: RequestFacade) => ({
              context: { req: wrapRequest(req, context, user) },
              schema,
            }),
            query: request.body,
          });

          return response.ok({
            body: gqlResponse,
            headers: {
              'content-type': 'application/json',
            },
          });
        } catch (error) {
          return this.handleError(error, response);
        }
      }
    );

    if (!this.isProductionMode) {
      this.router.get(
        {
          path: routePath,
          validate: { query: configSchema.object({}, { allowUnknowns: true }) },
          options: {
            tags: ['access:siem'],
          },
        },
        async (context, request, response) => {
          try {
            const user = await this.getCurrentUserInfo(request);
            const { query } = request;
            const gqlResponse = await runHttpQuery([request], {
              method: 'GET',
              options: (req: RequestFacade) => ({
                context: { req: wrapRequest(req, context, user) },
                schema,
              }),
              query,
            });

            return response.ok({
              body: gqlResponse,
              headers: {
                'content-type': 'application/json',
              },
            });
          } catch (error) {
            return this.handleError(error, response);
          }
        }
      );

      this.router.get(
        {
          path: `${routePath}/graphiql`,
          validate: false,
          options: {
            tags: ['access:siem'],
          },
        },
        async (context, request, response) => {
          const graphiqlString = await GraphiQL.resolveGraphiQLString(
            request.query,
            {
              endpointURL: routePath,
              passHeader: `'kbn-version': '${this.version}'`,
            },
            request
          );

          return response.ok({
            body: graphiqlString,
            headers: {
              'content-type': 'text/html',
            },
          });
        }
      );
    }
  }

  private async getCurrentUserInfo(request: KibanaRequest): Promise<AuthenticatedUser | null> {
    try {
      const user = await this.security.authc.getCurrentUser(request);
      return user;
    } catch {
      return null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleError(error: any, response: KibanaResponseFactory) {
    if (error.name !== 'HttpQueryError') {
      return response.internalError({
        body: error.message,
        headers: {
          'content-type': 'application/json',
        },
      });
    }

    return response.customError({
      statusCode: error.statusCode,
      body: error.message,
      headers: {
        'content-type': 'application/json',
        ...error.headers,
      },
    });
  }

  public getIndexPatternsService(request: FrameworkRequest): FrameworkIndexPatternsService {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callCluster = async (endpoint: string, params?: Record<string, any>) =>
      this.callWithRequest(request, endpoint, {
        ...params,
        allowNoIndices: true,
      });

    return new IndexPatternsFetcher(callCluster);
  }
}

export function wrapRequest<InternalRequest extends WrappableRequest>(
  req: InternalRequest,
  context: RequestHandlerContext,
  user: AuthenticatedUser | null
): FrameworkRequest<InternalRequest> {
  const { auth, params, payload, query } = req;

  return {
    [internalFrameworkRequest]: req,
    auth,
    context,
    params,
    payload,
    query,
    user,
  };
}
