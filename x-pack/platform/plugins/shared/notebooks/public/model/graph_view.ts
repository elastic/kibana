/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { graphlib, layout } from '@dagrejs/dagre';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { CellDefinition } from '../../common/types';
import { buildGraph } from './graph';
import { getCellParamNames, getExposedParamNames } from './references';

export const CELL_NODE_SIZE = { width: 180, height: 56 } as const;
export const SOURCE_NODE_SIZE = { width: 140, height: 40 } as const;

interface Position {
  x: number;
  y: number;
}

export type GraphViewNode =
  | { kind: 'cell'; id: string; cellId: string; position: Position; width: number }
  | { kind: 'source'; id: string; label: string; position: Position; width: number };

/** Measures how wide a node needs to be to fit its content. */
export type GetNodeWidth = (
  content: { kind: 'cell'; cellId: string } | { kind: 'source'; label: string }
) => number;

const getDefaultNodeWidth: GetNodeWidth = ({ kind }) =>
  kind === 'cell' ? CELL_NODE_SIZE.width : SOURCE_NODE_SIZE.width;

export interface GraphViewEdge {
  id: string;
  source: string;
  target: string;
  /** Params the source input binds for the target; empty for result and data-source edges. */
  params: readonly string[];
}

export interface GraphView {
  nodes: readonly GraphViewNode[];
  edges: readonly GraphViewEdge[];
}

const getSourceNodeId = (source: string): string => `source:${source}`;

/** Distinct index patterns an ES|QL query reads in its source command. */
export const getDataSources = (query: string): string[] => {
  try {
    const pattern = getIndexPatternFromESQLQuery(query);
    return [
      ...new Set(
        pattern
          .split(',')
          .map((source) => source.trim())
          .filter(Boolean)
      ),
    ];
  } catch {
    return [];
  }
};

const getCellQuery = (cell: CellDefinition): string | undefined => {
  if (cell.type === 'esql') return cell.query;
  if (cell.type === 'input' && cell.input.kind === 'dropdown') {
    const { optionsSource = 'query', optionsQuery } = cell.input;
    return optionsSource === 'query' ? optionsQuery : undefined;
  }
  return undefined;
};

const getEdgeParams = (parent: CellDefinition | undefined, child: CellDefinition): string[] => {
  if (parent?.type !== 'input') return [];
  const consumed = new Set(getCellParamNames(child));
  return getExposedParamNames(parent).filter((param) => consumed.has(param));
};

const sizeOf = ({ kind, width }: GraphViewNode) => ({
  width,
  height: kind === 'cell' ? CELL_NODE_SIZE.height : SOURCE_NODE_SIZE.height,
});

/** Positions nodes top to bottom by dependency depth; positions are top-left corners. */
const layoutNodes = (
  nodes: readonly GraphViewNode[],
  edges: readonly GraphViewEdge[]
): GraphViewNode[] => {
  const graph = new graphlib.Graph();
  graph.setGraph({ rankdir: 'TB', nodesep: 56, ranksep: 96 });
  graph.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((node) => graph.setNode(node.id, { ...sizeOf(node) }));
  edges.forEach(({ source, target }) => graph.setEdge(source, target));
  layout(graph);

  return nodes.map((node) => {
    const { x = 0, y = 0 } = graph.node(node.id) ?? {};
    const { width, height } = sizeOf(node);
    return { ...node, position: { x: x - width / 2, y: y - height / 2 } };
  });
};

/** A node with everything it feeds, directly or transitively, and the edges between them. */
export const getDownstream = (
  edges: readonly GraphViewEdge[],
  rootId: string
): { nodes: ReadonlySet<string>; edges: ReadonlySet<string> } => {
  const nodes = new Set([rootId]);
  const reached = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift();
    edges.forEach(({ id, source, target }) => {
      if (source !== current) return;
      reached.add(id);
      if (nodes.has(target)) return;
      nodes.add(target);
      queue.push(target);
    });
  }
  return { nodes, edges: reached };
};

/** The cells, the data sources they read, and the dependencies between them, laid out for display. */
export const buildGraphView = (
  cells: Readonly<Record<string, CellDefinition>>,
  cellOrder: readonly string[],
  getNodeWidth: GetNodeWidth = getDefaultNodeWidth
): GraphView => {
  const { parents } = buildGraph(cells, cellOrder);
  const cellIds = cellOrder.filter((id) => cells[id] !== undefined);
  const origin = { x: 0, y: 0 };

  const sources = new Map<string, string[]>();
  cellIds.forEach((id) => {
    const cell = cells[id];
    const query = cell ? getCellQuery(cell) : undefined;
    if (!query) return;
    getDataSources(query).forEach((source) => {
      sources.set(source, [...(sources.get(source) ?? []), id]);
    });
  });

  const nodes: GraphViewNode[] = [
    ...[...sources.keys()].map((label): GraphViewNode => {
      const content = { kind: 'source', label } as const;
      return {
        ...content,
        id: getSourceNodeId(label),
        position: origin,
        width: getNodeWidth(content),
      };
    }),
    ...cellIds.map((id): GraphViewNode => {
      const content = { kind: 'cell', cellId: id } as const;
      return { ...content, id, position: origin, width: getNodeWidth(content) };
    }),
  ];

  const edges: GraphViewEdge[] = [
    ...[...sources].flatMap(([source, readers]) =>
      readers.map((target) => ({
        id: `${getSourceNodeId(source)}->${target}`,
        source: getSourceNodeId(source),
        target,
        params: [],
      }))
    ),
    ...cellIds.flatMap((target) => {
      const child = cells[target];
      if (!child) return [];
      return (parents.get(target) ?? []).map((source) => ({
        id: `${source}->${target}`,
        source,
        target,
        params: getEdgeParams(cells[source], child),
      }));
    }),
  ];

  return { nodes: layoutNodes(nodes, edges), edges };
};
