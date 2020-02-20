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
  IRouter,
  KibanaResponseFactory,
  RequestHandlerContext,
  KibanaRequest,
} from '../../../../../../../src/core/server';
import { IndexPatternsFetcher } from '../../../../../../../src/plugins/data/server';
import { AuthenticatedUser } from '../../../../../../plugins/security/common/model';
import { CoreSetup, SetupPlugins } from '../../plugin';

import {
  FrameworkAdapter,
  FrameworkIndexPatternsService,
  FrameworkRequest,
  internalFrameworkRequest,
} from './types';

export class KibanaBackendFrameworkAdapter implements FrameworkAdapter {
  private router: IRouter;
  private security: SetupPlugins['security'];

  constructor(core: CoreSetup, plugins: SetupPlugins, private isProductionMode: boolean) {
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
        validate: { body: configSchema.object({}, { allowUnknowns: true }) },
        options: {
          tags: ['access:siem'],
        },
      },
      async (context, request, response) => {
        try {
          const user = await this.getCurrentUserInfo(request);
          const gqlResponse = await runHttpQuery([request], {
            method: 'POST',
            options: (req: KibanaRequest) => ({
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
              passHeader: "'kbn-xsrf': 'graphiql'",
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

export function wrapRequest(
  request: KibanaRequest,
  context: RequestHandlerContext,
  user: AuthenticatedUser | null
): FrameworkRequest {
  return {
    [internalFrameworkRequest]: request,
    body: request.body,
    context,
    user,
  };
}
