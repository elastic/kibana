/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ResourceAssignment, RoutingTable } from './routing_table';
import { CodeNode, CodeNodes } from './code_nodes';
import { ClusterState } from './cluster_state';
import { Logger } from '../../log';

/**
 * The scheduler decides how to allocate resources to nodes. Allocating resources to nodes basically follows 2 steps:
 * - Filter: find nodes that is applicable for the resource, based on attributes of nodes and restrictions of policies.
 * - Score: score each applicable node for the resource, and return a list of applicable nodes sorted by the score in the
 *   descending order.
 * - Decide: pick the best fit node from the list as the candidate.
 */
export class ResourceScheduler {
  constructor(private readonly policies: ResourceSchedulePolicy[], private readonly log: Logger) {}

  public allocate(resources: string[], state: ClusterState): ResourceAssignment[] {
    if (_.isEmpty(resources)) {
      return [];
    }
    if (_.isEmpty(state.nodes.nodes)) {
      return [];
    }
    // remove repos cannot be allocated
    const allocatableRepos = resources.filter(repo => {
      return _.every(this.policies, policy =>
        policy.canAllocate(repo, state.routingTable, state.nodes)
      );
    });
    if (_.isEmpty(allocatableRepos)) {
      return [];
    }
    const assignments: ResourceAssignment[] = [];
    let routingTable = state.routingTable;
    for (const resource of resources) {
      const assignment = this.allocateResource(resource, state.nodes, routingTable);
      if (!assignment) {
        continue;
      }
      assignments.push(assignment);
      routingTable = routingTable.assign([assignment]);
      this.log.info(`Assigned resource [${resource}] to node [${assignment.nodeId}]`);
    }
    return assignments;
  }

  protected allocateResource(
    resource: string,
    nodes: CodeNodes,
    routingTable: RoutingTable
  ): ResourceAssignment | undefined {
    const scoredNodes = nodes.nodes
      .filter(node => {
        // remove nodes that the
        return _.every(this.policies, policy =>
          policy.canAllocateOnNode(resource, node, routingTable, nodes)
        );
      })
      .map(node => {
        const score = this.policies.reduce(
          (prev, policy) => prev * policy.score(resource, node, routingTable, nodes),
          1
        );
        return { node, score };
      });
    if (_.isEmpty(scoredNodes)) {
      return undefined;
    }

    let bestFit = scoredNodes[0];
    for (const node of scoredNodes) {
      if (node.score >= bestFit.score) {
        // use the node id as the tie-breaker
        if (node.node.id > bestFit.node.id) {
          bestFit = node;
        }
      }
    }

    return {
      nodeId: bestFit.node.id,
      resource,
    };
  }
}

export interface ResourceSchedulePolicy {
  /**
   * Decide whether the resource can be allocated to any node, according to the current cluster state.
   */
  canAllocate(resource: string, routingTable: RoutingTable, nodes: CodeNodes): boolean;

  /**
   * Decide whether the resource can be allocated to the node, according to the current cluster state.
   */
  canAllocateOnNode(
    resource: string,
    node: CodeNode,
    routingTable: RoutingTable,
    nodes: CodeNodes
  ): boolean;

  /**
   * Calculate the score of the assignment, the higher the better.
   */
  score(resource: string, node: CodeNode, routingTable: RoutingTable, nodes: CodeNodes): number;
}
