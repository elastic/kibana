/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ResourceSchedulePolicy } from './resource_scheduler';
import { RoutingTable } from './routing_table';
import { CodeNode, CodeNodes } from './code_nodes';

/**
 * A policy that assigns resources to nodes based on hash of the resource id. It is easy and stable for a cluster with
 * a static node table.
 */
export class HashSchedulePolicy implements ResourceSchedulePolicy {
  canAllocate(resource: string, routingTable: RoutingTable, nodes: CodeNodes): boolean {
    return !_.isEmpty(nodes.nodes);
  }

  canAllocateOnNode(
    resource: string,
    node: CodeNode,
    routingTable: RoutingTable,
    nodes: CodeNodes
  ): boolean {
    if (_.isEmpty(nodes.nodes)) {
      return false;
    }

    const sortedNodeIds: string[] = nodes.nodes.map(n => n.id).sort();

    const hashCode = this.hash(resource);
    const targetNodeId = sortedNodeIds[hashCode % sortedNodeIds.length];
    return targetNodeId === node.id;
  }

  /**
   * To calculate the hash code of the string as s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1],
   * see code snippets from https://gist.github.com/hyamamoto/fd435505d29ebfa3d9716fd2be8d42f0.
   */
  private hash(s: string): number {
    let hashCode = 0;
    for (let i = 0; i < s.length; i++) {
      // eslint-disable-next-line no-bitwise
      hashCode = (Math.imul(31, hashCode) + s.charCodeAt(i)) | 0;
    }
    return Math.abs(hashCode);
  }

  score(resource: string, node: CodeNode, routingTable: RoutingTable, nodes: CodeNodes): number {
    return 1;
  }
}
