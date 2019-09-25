/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from '@hapi/hapi';
import Boom from '@hapi/boom';
import { Endpoint, ResourceLocator } from '../resource_locator';
import { ClusterService } from './cluster_service';
import { LocalEndpoint } from '../local_endpoint';
import { RepositoryUtils } from '../../../common/repository_utils';
import { ResourceSchedulerService } from './resource_scheduler_service';
import { ClusterMembershipService } from './cluster_membership_service';
import { ClusterNodeEndpoint } from './cluster_node_endpoint';

export class ClusterResourceLocator implements ResourceLocator {
  constructor(
    private readonly clusterService: ClusterService,
    private readonly clusterMembershipService: ClusterMembershipService,
    // @ts-ignore
    private readonly schedulerService: ResourceSchedulerService
  ) {}

  protected repositoryUri(url: string): string {
    return RepositoryUtils.buildRepository(url).uri;
  }

  async locate(req: Request, resource: string): Promise<Endpoint> {
    // to be compatible with
    if (resource.trim() === '') {
      return new LocalEndpoint(req, resource);
    }
    const state = this.clusterService.state();
    const nodeId = state.routingTable.getNodeIdByRepositoryURI(this.repositoryUri(resource));
    if (!nodeId) {
      throw Boom.notFound(`resource [${resource}] not exists`);
    }
    if (this.clusterMembershipService.localNode.id === nodeId) {
      return new LocalEndpoint(req, resource);
    } else {
      const node = state.nodes.getNodeById(nodeId);
      if (!node) {
        throw Boom.notFound(`Node [${nodeId}] not found`);
      }
      return new ClusterNodeEndpoint(req, resource, node);
    }
  }

  async isResourceLocal(resource: string): Promise<boolean> {
    const state = this.clusterService.state();
    return (
      this.clusterMembershipService.localNode.id ===
      state.routingTable.getNodeIdByRepositoryURI(this.repositoryUri(resource))
    );
  }

  /**
   * Return undefined to let NodeRepositoriesService enqueue the clone job in cluster mode.
   */
  async allocate(req: Request, resource: string): Promise<Endpoint | undefined> {
    // make the cluster service synchronize the meta data and allocate new resources to nodes
    await this.clusterService.pollClusterState();
    return undefined;
  }
}
