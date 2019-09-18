/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface CodeNode {
  id: string;
  address: string;
}

export class CodeNodes {
  private readonly idToNodes: Map<string, CodeNode>;

  constructor(public readonly nodes: CodeNode[]) {
    this.idToNodes = new Map<string, CodeNode>(
      nodes.map(node => {
        return [node.id, node];
      })
    );
  }

  public getNodeById(id: string): CodeNode | undefined {
    return this.idToNodes.get(id);
  }
}
