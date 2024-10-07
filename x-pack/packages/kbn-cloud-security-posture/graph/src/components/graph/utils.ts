/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EdgeLabelHeight, EdgeLabelWidth } from '../edge/styles';
import { LABEL_BORDER_WIDTH, LABEL_PADDING_X } from '../node/styles';
import type { NodeViewModel, EdgeViewModel } from '../types';

const LABEL_FONT = `600 7.875px Inter, "system-ui", Helvetica, Arial, sans-serif`;
const LABEL_PADDING = (LABEL_PADDING_X + LABEL_BORDER_WIDTH) * 2;

export interface Graph<TNode extends NodeViewModel> {
  nodes: Set<TNode['id']>;
  sourceNodes: Set<TNode['id']>;
}

export interface AllGraphs<TNode extends NodeViewModel> {
  graphs: Array<Graph<TNode>>;
  adjacencyList: Map<TNode['id'], Array<TNode['id']>>;
}

export const findAllGraphs = <TNode extends NodeViewModel, TEdge extends EdgeViewModel>(
  nodes: TNode[],
  edges: TEdge[]
): AllGraphs<TNode> => {
  type NodeId = TNode['id'];

  // Adjacency list is created to represent the edges between nodes.
  const adjacencyList = new Map<NodeId, NodeId[]>();

  // We maintain a map (inDegree) that tracks how many edges are directed to each node.
  const inDegree = new Map<NodeId, number>();

  // Initialize adjacency list and in-degree counts
  nodes.forEach((node) => {
    adjacencyList.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // Populate adjacency list and in-degree counts
  for (const { source, target } of edges) {
    adjacencyList.get(source)?.push(target);
    inDegree.set(source, (inDegree.get(source) || 0) + 1); // Increment in-degree for the target node
  }

  const visited = new Set<NodeId>();
  const allGraphs: Array<Graph<TNode>> = [];

  // Traverse each node
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const currentGraph: Graph<TNode> = {
        nodes: new Set<NodeId>(),
        sourceNodes: new Set<NodeId>(),
      };

      if ((adjacencyList.get(node.id) || []).length > 0) {
        dfs(node.id, adjacencyList, visited, currentGraph);
      } else {
        currentGraph.nodes.add(node.id); // Add isolated node as its own graph
      }

      allGraphs.push(currentGraph);
    }

    // Identify source nodes (nodes with no incoming edges)
    if ((inDegree.get(node.id) || 0) === 0 && (adjacencyList.get(node.id) || []).length > 0) {
      allGraphs.forEach((graph) => {
        if (graph.nodes.has(node.id)) {
          graph.sourceNodes.add(node.id);
        }
      });
    }
  }

  return { graphs: allGraphs, adjacencyList };
};

const dfs = <TNode extends NodeViewModel>(
  node: TNode['id'],
  adjacencyList: Map<TNode['id'], Array<TNode['id']>>,
  visited: Set<TNode['id']>,
  currentGraph: Graph<TNode>
) => {
  visited.add(node);
  currentGraph.nodes.add(node);

  const neighbors = adjacencyList.get(node) || [];
  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      dfs(neighbor, adjacencyList, visited, currentGraph);
    }
  }
};

export const calcLabelSize = (label?: string) => {
  const currLblWidth = Math.max(EdgeLabelWidth, LABEL_PADDING + getTextWidth(label ?? ''));
  return { width: currLblWidth, height: EdgeLabelHeight };
};

export function getTextWidth(text: string, font: string = LABEL_FONT) {
  // re-use canvas object for better performance
  const canvas: HTMLCanvasElement =
    // @ts-ignore
    getTextWidth.canvas || (getTextWidth.canvas = document.createElement('canvas'));
  const context = canvas.getContext('2d');
  if (context) {
    context.font = font;
  }
  const metrics = context?.measureText(text);
  return metrics?.width ?? 0;
}

function getCssStyle(element: HTMLElement, prop: string) {
  return window.getComputedStyle(element, null).getPropertyValue(prop);
}

// @ts-ignore
function getCanvasFont(el = document.body) {
  const fontWeight = getCssStyle(el, 'font-weight') || 'normal';
  const fontSize = getCssStyle(el, 'font-size') || '16px';
  const fontFamily = getCssStyle(el, 'font-family') || 'Times New Roman';

  return `${fontWeight} ${fontSize} ${fontFamily}`;
}
