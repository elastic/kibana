/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import d3 from 'd3';
import type { WorkspaceEdge, WorkspaceNode } from '../../types';

interface GraphLayoutControllerOptions {
  getNodes: () => WorkspaceNode[];
  getEdges: () => WorkspaceEdge[];
  onTick?: () => void;
}

export class GraphLayoutController {
  private force: ReturnType<typeof d3.layout.force> | null = null;

  constructor(private readonly options: GraphLayoutControllerOptions) {}

  public isRunning(): boolean {
    return this.force !== null;
  }

  public stop(): void {
    this.force?.stop();
    this.force = null;
  }

  public start(): void {
    this.stop();

    const nodes = this.options.getNodes();
    const effectiveEdges = this.createEffectiveEdges(this.options.getEdges());
    const visibleNodes = nodes.filter(({ parent }) => parent === undefined);
    this.updateChildCounts(nodes);

    this.force = d3.layout
      .force()
      .nodes(visibleNodes)
      .links(effectiveEdges)
      .friction(0.8)
      .linkDistance(100)
      .charge(-1500)
      .gravity(0.15)
      .theta(0.99)
      .alpha(0.5)
      .size([800, 600])
      .on('tick', () => {
        this.updateRenderedPositions(nodes);
        this.options.onTick?.();
      });
    this.force.start();
  }

  private createEffectiveEdges(edges: WorkspaceEdge[]) {
    const effectiveEdges: Array<{ source: WorkspaceNode; target: WorkspaceNode }> = [];
    for (const edge of edges) {
      const topSrc = this.getTopLevelNode(edge.source);
      const topTarget = this.getTopLevelNode(edge.target);
      edge.topSrc = topSrc;
      edge.topTarget = topTarget;
      if (topSrc !== topTarget) {
        effectiveEdges.push({ source: topSrc, target: topTarget });
      }
    }
    return effectiveEdges;
  }

  private updateChildCounts(nodes: WorkspaceNode[]): void {
    nodes.forEach((node) => {
      node.numChildren = 0;
    });
    nodes.forEach((node) => {
      let parent = node.parent;
      while (parent) {
        parent.numChildren += 1;
        parent = parent.parent;
      }
    });
  }

  private updateRenderedPositions(nodes: WorkspaceNode[]): void {
    nodes.forEach((node) => {
      const renderedNode = this.getTopLevelNode(node);
      node.kx = renderedNode.x;
      node.ky = renderedNode.y;
    });
  }

  private getTopLevelNode(node: WorkspaceNode): WorkspaceNode {
    let topLevelNode = node;
    while (topLevelNode.parent) {
      topLevelNode = topLevelNode.parent;
    }
    return topLevelNode;
  }
}
