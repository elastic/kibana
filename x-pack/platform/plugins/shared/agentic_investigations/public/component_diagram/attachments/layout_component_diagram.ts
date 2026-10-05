/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dagre, { graphlib } from '@dagrejs/dagre';
import type {
  Flowchart,
  FlowchartEdge,
  FlowchartNode,
} from '../../../common/component_diagram/parse_mermaid_flowchart';

export const PROBLEM_CLASS = 'problem';

const MIN_NODE_WIDTH = 120;
const MAX_NODE_WIDTH = 220;
const CHAR_WIDTH = 7;
const NODE_PADDING = 40;
const LINE_HEIGHT = 18;
const BASE_NODE_HEIGHT = 30;
const GROUP_LINE_HEIGHT = 14;

export interface ComponentNodeLayout {
  node: FlowchartNode;
  isProblem: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComponentEdgeLayout {
  id: string;
  edge: FlowchartEdge;
  /** The edge starts or ends at a problem node. */
  touchesProblem: boolean;
}

export interface ComponentDiagramLayout {
  /** Whether edges run left to right (or right to left) rather than top to bottom. */
  horizontal: boolean;
  nodes: ComponentNodeLayout[];
  edges: ComponentEdgeLayout[];
}

/** Box size for a node label: wraps long lines at {@link MAX_NODE_WIDTH}. */
const measure = ({ label, group }: FlowchartNode): { width: number; height: number } => {
  const lines = label.split('\n');
  const longest = Math.max(...lines.map((line) => line.length));
  const width = Math.min(
    MAX_NODE_WIDTH,
    Math.max(MIN_NODE_WIDTH, longest * CHAR_WIDTH + NODE_PADDING)
  );
  const perLine = Math.max(1, Math.floor((width - NODE_PADDING) / CHAR_WIDTH));
  const lineCount = lines.reduce(
    (count, line) => count + Math.max(1, Math.ceil(line.length / perLine)),
    0
  );
  return {
    width,
    height: BASE_NODE_HEIGHT + lineCount * LINE_HEIGHT + (group ? GROUP_LINE_HEIGHT : 0),
  };
};

/**
 * Lays a parsed flowchart out with dagre in the flowchart's direction. Nodes in
 * `problemNodeIds`, or with Mermaid class `problem`, are marked as where the problem is.
 */
export const layoutComponentDiagram = (
  { direction, nodes, edges }: Flowchart,
  problemNodeIds: readonly string[]
): ComponentDiagramLayout => {
  const problems = new Set(problemNodeIds);
  const isProblem = (node: FlowchartNode) =>
    problems.has(node.id) || node.classes.includes(PROBLEM_CLASS);

  const graph = new graphlib.Graph({ multigraph: true });
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: direction, nodesep: 40, ranksep: 70, marginx: 10, marginy: 10 });
  const sizes = new Map(nodes.map((node) => [node.id, measure(node)]));
  for (const node of nodes) {
    graph.setNode(node.id, { ...sizes.get(node.id) });
  }
  edges.forEach((edge, index) => {
    // Edge labels need room between ranks.
    graph.setEdge(
      edge.source,
      edge.target,
      edge.label ? { width: edge.label.length * 6, height: 16 } : {},
      `${index}`
    );
  });
  dagre.layout(graph);

  const problemIds = new Set(nodes.filter(isProblem).map(({ id }) => id));
  return {
    horizontal: direction === 'LR' || direction === 'RL',
    nodes: nodes.map((node) => {
      const { x, y } = graph.node(node.id);
      const { width, height } = sizes.get(node.id) ?? measure(node);
      return {
        node,
        isProblem: problemIds.has(node.id),
        x: x - width / 2,
        y: y - height / 2,
        width,
        height,
      };
    }),
    edges: edges.map((edge, index) => ({
      id: `edge-${index}`,
      edge,
      touchesProblem: problemIds.has(edge.source) || problemIds.has(edge.target),
    })),
  };
};
