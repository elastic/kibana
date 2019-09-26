/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * A snapshot of the routing table, which defines on which node each repository resides.
 *
 * Currently, the relationship between nodes and repositories is one to many.
 */
export class RoutingTable {
  private readonly node2Repos: Map<string, string[]>;
  private readonly repo2Node: Map<string, string>;

  constructor(private readonly assignments: ResourceAssignment[] = []) {
    this.repo2Node = new Map<string, string>(assignments.map(t => [t.resource, t.nodeId]));
    this.node2Repos = assignments.reduce(function(map, assignment) {
      let arr = map.get(assignment.nodeId);
      if (!arr) {
        arr = [];
        map.set(assignment.nodeId, arr);
      }
      arr.push(assignment.resource);
      return map;
    }, new Map<string, string[]>());
  }

  public assign(assignments: ResourceAssignment[]): RoutingTable {
    return new RoutingTable(this.assignments.concat(assignments));
  }

  /**
   * return a new routing table without given repositories
   */
  public withoutRepositories(repoUris: Set<string>): RoutingTable {
    return new RoutingTable(
      this.assignments.filter(assignment => !repoUris.has(assignment.resource))
    );
  }

  public nodeIds(): string[] {
    return Array.from(this.node2Repos.keys());
  }

  public repositoryURIs(): string[] {
    return Array.from(this.repo2Node.keys());
  }

  public getNodeIdByRepositoryURI(repoURI: string): string | undefined {
    return this.repo2Node.get(repoURI);
  }

  public getRepositoryURIsByNodeId(nodeId: string): string[] {
    return this.node2Repos.get(nodeId) || [];
  }

  public toString(): string {
    let str: string = '[';
    let first: boolean = true;
    this.repo2Node.forEach((v, k, m) => {
      if (first) {
        first = false;
      } else {
        str += ', ';
      }
      str += `${k}: ${v}`;
    });
    return str + ']';
  }
}

export interface ResourceAssignment {
  nodeId: string;
  resource: string;
}
