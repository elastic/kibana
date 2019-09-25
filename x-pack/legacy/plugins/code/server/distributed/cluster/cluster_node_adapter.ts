/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from '@hapi/hapi';
import util from 'util';
import Boom from '@hapi/boom';
import { ServiceHandlerAdapter, ServiceRegisterOptions } from '../service_handler_adapter';
import { ResourceLocator } from '../resource_locator';
import {
  MethodHandler,
  MethodsFor,
  ServiceDefinition,
  ServiceHandlerFor,
  ServiceMethod,
  ServiceMethodMap,
} from '../service_definition';
import { ServerOptions } from '../../server_options';
import { ClusterMembershipService } from './cluster_membership_service';
import { ConfigClusterMembershipService } from './config_cluster_membership_service';
import { ClusterService } from './cluster_service';
import { ClusterResourceLocator } from './cluster_resource_locator';
import { CodeServerRouter } from '../../security';
import { Logger } from '../../log';
import { NonCodeNodeAdapter } from '../multinode/non_code_node_adapter';
import { RequestPayload } from '../multinode/code_node_adapter';
import { EsClient } from '../../lib/esqueue';
import { ResourceSchedulerService } from './resource_scheduler_service';
import { ClusterNodeEndpoint } from './cluster_node_endpoint';

/**
 * Serve requests based on the routing table.
 *
 * For local request:
 * - serve request locally or reroute to the remote node, based on the routing table
 *
 * For remote request:
 * - serve request locally if the requested resource is on the local node, otherwise reject it
 */
export class ClusterNodeAdapter implements ServiceHandlerAdapter {
  readonly clusterService: ClusterService;
  readonly clusterMembershipService: ClusterMembershipService;
  private readonly schedulerService: ResourceSchedulerService;
  private readonly handlers: Map<any, any> = new Map<any, any>();
  // used to forward requests
  private readonly nonCodeAdapter: NonCodeNodeAdapter = new NonCodeNodeAdapter('', this.log);

  constructor(
    private readonly server: CodeServerRouter,
    private readonly log: Logger,
    serverOptions: ServerOptions,
    esClient: EsClient
  ) {
    this.clusterService = new ClusterService(esClient, log);
    this.clusterMembershipService = new ConfigClusterMembershipService(
      serverOptions,
      this.clusterService,
      log
    );
    this.schedulerService = new ResourceSchedulerService(this.clusterService, log);
    this.locator = new ClusterResourceLocator(
      this.clusterService,
      this.clusterMembershipService,
      this.schedulerService
    );
  }

  locator: ResourceLocator;

  async start(): Promise<void> {
    await this.clusterService.start();
    await this.clusterMembershipService.start();
    await this.schedulerService.start();
  }

  async stop(): Promise<void> {
    await this.schedulerService.stop();
    await this.clusterMembershipService.stop();
    await this.clusterService.stop();
  }

  getService<DEF extends ServiceDefinition>(serviceDefinition: DEF): ServiceMethodMap<DEF> {
    const handler = this.handlers.get(serviceDefinition);
    if (!handler) {
      throw new Error(`Handler not exists for ${serviceDefinition}`);
    }
    return handler as ServiceMethodMap<DEF>;
  }

  registerHandler<DEF extends ServiceDefinition>(
    serviceDefinition: DEF,
    serviceHandler: ServiceHandlerFor<DEF> | null,
    options: ServiceRegisterOptions
  ): ServiceMethodMap<DEF> {
    if (!serviceHandler) {
      throw new Error('Service handler cannot be null');
    }
    const routableServiceHandler: ServiceMethodMap<DEF> = {} as ServiceMethodMap<DEF>;

    // register a local handler that is able to route the request
    for (const method in serviceDefinition) {
      if (serviceDefinition.hasOwnProperty(method)) {
        const localHandler = serviceHandler[method];
        const wrappedHandler = this.wrapRoutableHandler(
          method,
          serviceDefinition[method],
          localHandler,
          options
        );
        routableServiceHandler[method] = wrappedHandler;

        const d = serviceDefinition[method];
        const path = `${options.routePrefix}/${d.routePath || method}`;
        this.server.route({
          method: 'post',
          path,
          handler: async (req: Request) => {
            const { context, params } = req.payload as RequestPayload;
            this.log.debug(`Receiving RPC call ${req.url.path} ${util.inspect(params)}`);
            try {
              const data = await localHandler(params, context);
              return { data };
            } catch (e) {
              throw Boom.boomify(e);
            }
          },
        });
        this.log.info(`Registered handler for ${path}`);
      }
    }

    this.handlers.set(serviceDefinition, routableServiceHandler);

    return routableServiceHandler;
  }

  private wrapRoutableHandler<
    SERVICE_DEFINITION extends ServiceDefinition,
    METHOD extends MethodsFor<SERVICE_DEFINITION>
  >(
    method: string,
    d: { routePath?: string },
    handler: MethodHandler<SERVICE_DEFINITION, METHOD>,
    options: ServiceRegisterOptions
  ): ServiceMethod<SERVICE_DEFINITION, METHOD> {
    return async (endpoint, params) => {
      const requestContext = endpoint.toContext();
      if (endpoint instanceof ClusterNodeEndpoint) {
        let path = `${options.routePrefix}/${d.routePath || method}`;
        // if we want to join base url http://localhost:5601/api with path /abc/def to get
        // http://localhost:5601/api/abc/def, the base url must end with '/', and the path cannot start with '/'
        // see https://github.com/hapijs/wreck/commit/6fc514c58c5c181327fa3e84d2a95d7d8b93f079
        if (path.startsWith('/')) {
          path = path.substr(1);
        }
        const payload = {
          context: requestContext,
          params,
        } as RequestPayload;
        this.log.debug(
          `Request [${path}] at [${endpoint.codeNode.address}] with [${util.inspect(payload)}]`
        );
        const { data } = await this.nonCodeAdapter.requestFn(
          endpoint.codeNode.address,
          path,
          payload,
          endpoint.httpRequest
        );
        return data;
      } else {
        return handler(params, requestContext);
      }
    };
  }
}
