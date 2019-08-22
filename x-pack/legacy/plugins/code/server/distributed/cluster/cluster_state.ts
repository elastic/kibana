/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RoutingTable } from './routing_table';
import { Repository } from '../../../model';
import { ClusterMetadata } from './cluster_meta';
import { CodeNodes } from './code_nodes';

/**
 * A snapshot of the meta data and the routing table of the cluster.
 */
export class ClusterState {
  constructor(
    public readonly clusterMeta: ClusterMetadata,
    public readonly routingTable: RoutingTable,
    public readonly nodes: CodeNodes
  ) {}

  static empty(): ClusterState {
    return new ClusterState(new ClusterMetadata([]), new RoutingTable([]), new CodeNodes([]));
  }

  /**
   * Get all repository objects belongs to the given node id according to the routing table.
   * @param nodeId the id of the node.
   */
  public getNodeRepositories(nodeId: string): Repository[] {
    return this.routingTable
      .getRepositoryURIsByNodeId(nodeId)
      .map(uri => {
        return this.clusterMeta.getRepository(uri);
      })
      .filter(repo => {
        // the repository uri exists in the routing table, but not exists as a meta object
        // it means the routing table is stale
        return repo !== undefined;
      }) as Repository[];
  }

  /**
   * find repositories not exists in the routing table, or the node it assigned to doesn't exists in the cluster
   */
  public getUnassignedRepositories(): Repository[] {
    return this.clusterMeta.repositories.filter(repo => {
      const nodeId = this.routingTable.getNodeIdByRepositoryURI(repo.uri);
      if (!nodeId) {
        return true;
      }
      return this.nodes.getNodeById(nodeId) === undefined;
    });
  }

  public toString(): string {
    return `{routingTable: ${this.routingTable}}`;
  }
}
