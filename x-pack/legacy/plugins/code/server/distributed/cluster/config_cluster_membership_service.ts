/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import util from 'util';
import { ClusterMembershipService } from './cluster_membership_service';
import { ServerOptions } from '../../server_options';
import { ClusterService } from './cluster_service';
import { CodeNode, CodeNodes } from './code_nodes';
import { ClusterState } from './cluster_state';
import { Logger } from '../../log';

export class ConfigClusterMembershipService implements ClusterMembershipService {
  private readonly nodes: CodeNodes;

  public readonly localNode: CodeNode;

  constructor(
    private readonly options: ServerOptions,
    private readonly clusterService: ClusterService,
    private readonly log: Logger
  ) {
    this.localNode = {
      id: options.serverUUID,
      address: options.localAddress,
    } as CodeNode;

    // if no nodes are configured, add the local node, to be compatible with the single node mode
    if (this.options.codeNodes.length > 0) {
      this.nodes = new CodeNodes(this.options.codeNodes);
    } else {
      this.nodes = new CodeNodes([this.localNode]);
    }
    this.log.info(
      `Joined node [${util.inspect(this.localNode)}] to cluster ${util.inspect(this.nodes.nodes)}`
    );
  }

  async start(): Promise<void> {
    const state = this.clusterService.state();
    this.clusterService.setClusterState(
      new ClusterState(state.clusterMeta, state.routingTable, this.nodes)
    );
  }

  async stop(): Promise<void> {}
}
