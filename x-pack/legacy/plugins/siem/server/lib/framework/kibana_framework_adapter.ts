/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GenericParams } from 'elasticsearch';
import { EnvironmentMode } from 'kibana/public';
import { GraphQLSchema } from 'graphql';
import { Legacy } from 'kibana';

import {
  graphiqlHapi,
  graphqlHapi,
  HapiGraphiQLPluginOptions,
  HapiGraphQLPluginOptions,
} from './apollo_server_hapi';
import {
  FrameworkAdapter,
  FrameworkIndexPatternsService,
  FrameworkRequest,
  internalFrameworkRequest,
  WrappableRequest,
} from './types';

interface CallWithRequestParams extends GenericParams {
  max_concurrent_shard_requests?: number;
}

export class KibanaBackendFrameworkAdapter implements FrameworkAdapter {
  public version: string;
  public envMode: EnvironmentMode;

  constructor(private server: Legacy.Server) {
    this.version = server.config().get('pkg.version');
    this.envMode = server.newPlatform.env.mode;
  }

  public async callWithRequest(
    req: FrameworkRequest<Legacy.Request>,
    endpoint: string,
    params: CallWithRequestParams,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...rest: any[]
  ) {
    const internalRequest = req[internalFrameworkRequest];
    const { elasticsearch } = internalRequest.server.plugins;
    const { callWithRequest } = elasticsearch.getCluster('data');
    const includeFrozen = await internalRequest.getUiSettingsService().get('search:includeFrozen');
    const maxConcurrentShardRequests =
      endpoint === 'msearch'
        ? await internalRequest.getUiSettingsService().get('courier:maxConcurrentShardRequests')
        : 0;
    const fields = await callWithRequest(
      internalRequest,
      endpoint,
      {
        ...params,
        ignore_throttled: !includeFrozen,
        ...(maxConcurrentShardRequests > 0
          ? { max_concurrent_shard_requests: maxConcurrentShardRequests }
          : {}),
      },
      ...rest
    );
    return fields;
  }

  public exposeStaticDir(urlPath: string, dir: string): void {
    this.server.route({
      handler: {
        directory: {
          path: dir,
        },
      },
      method: 'GET',
      path: urlPath,
    });
  }

  public registerGraphQLEndpoint(routePath: string, schema: GraphQLSchema): void {
    this.server.register<HapiGraphQLPluginOptions>({
      options: {
        graphqlOptions: (req: Legacy.Request) => ({
          context: { req: wrapRequest(req) },
          schema,
        }),
        path: routePath,
        route: {
          tags: ['access:siem'],
        },
      },
      plugin: graphqlHapi,
    });

    if (!this.envMode.prod) {
      this.server.register<HapiGraphiQLPluginOptions>({
        options: {
          graphiqlOptions: {
            endpointURL: routePath,
            passHeader: `'kbn-version': '${this.version}'`,
          },
          path: `${routePath}/graphiql`,
          route: {
            tags: ['access:siem'],
          },
        },
        plugin: graphiqlHapi,
      });
    }
  }

  public getIndexPatternsService(
    request: FrameworkRequest<Legacy.Request>
  ): FrameworkIndexPatternsService {
    return this.server.indexPatternsServiceFactory({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callCluster: async (method: string, args: [GenericParams], ...rest: any[]) => {
        const fieldCaps = await this.callWithRequest(
          request,
          method,
          { ...args, allowNoIndices: true } as GenericParams,
          ...rest
        );
        return fieldCaps;
      },
    });
  }

  public getSavedObjectsService() {
    return this.server.savedObjects;
  }
}

export function wrapRequest<InternalRequest extends WrappableRequest>(
  req: InternalRequest
): FrameworkRequest<InternalRequest> {
  const { auth, params, payload, query } = req;

  return {
    [internalFrameworkRequest]: req,
    auth,
    params,
    payload,
    query,
  };
}
