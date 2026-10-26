/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configuredDestinationNodeId, configuredSourceNodeId } from './build_unit_connection_edges';
import { applyCanvasSearch, normalizeCanvasQuery, resolveCanvasSearch } from './canvas_search';
import {
  DESTINATION_NODE_TYPE,
  SOURCE_NODE_TYPE,
  type ClassicCanvasEdge,
  type ClassicCanvasGraph,
  type DestinationNode,
  type SourceNode,
} from './types';

const sourceNode = (sourceId: string, title: string, subtitle = 'Bulk'): SourceNode => ({
  id: configuredSourceNodeId(sourceId),
  type: SOURCE_NODE_TYPE,
  position: { x: 0, y: 0 },
  data: { sourceId, title, subtitle },
});

const destinationNode = (destinationId: string, title: string): DestinationNode => ({
  id: configuredDestinationNodeId(destinationId),
  type: DESTINATION_NODE_TYPE,
  position: { x: 0, y: 0 },
  data: { destinationId, title },
});

const placeholderNode = (nodeId: string): DestinationNode => ({
  id: nodeId,
  type: DESTINATION_NODE_TYPE,
  position: { x: 0, y: 0 },
  data: { unconfiguredNodeId: nodeId, title: 'New destination' },
});

const edge = (sourceId: string, destinationId: string): ClassicCanvasEdge => ({
  id: `${sourceId}->${destinationId}`,
  source: configuredSourceNodeId(sourceId),
  target: configuredDestinationNodeId(destinationId),
});

// nginx -> archive, nginx -> logs-nginx, otlp -> logs-nginx, plus an unconnected placeholder.
const graph: ClassicCanvasGraph = {
  nodes: [
    sourceNode('s1', 'Nginx', 'Logs'),
    sourceNode('s2', 'MOTLP endpoint', 'Managed input'),
    destinationNode('d1', 'archive'),
    destinationNode('d2', 'logs-nginx-default'),
    placeholderNode('new-1'),
  ],
  edges: [edge('s1', 'd1'), edge('s1', 'd2'), edge('s2', 'd2')],
};

const nodeIdsOf = (flow: ReturnType<typeof resolveCanvasSearch>) =>
  [...(flow?.nodeIds ?? [])].sort();

describe('normalizeCanvasQuery', () => {
  it('trims, lowercases and treats blank input as no query', () => {
    expect(normalizeCanvasQuery('  Nginx ')).toBe('nginx');
    expect(normalizeCanvasQuery('   ')).toBeNull();
    expect(normalizeCanvasQuery(null)).toBeNull();
    expect(normalizeCanvasQuery(undefined)).toBeNull();
  });
});

describe('resolveCanvasSearch', () => {
  it('returns undefined for an empty query', () => {
    expect(resolveCanvasSearch(graph, null)).toBeUndefined();
    expect(resolveCanvasSearch(graph, '  ')).toBeUndefined();
  });

  it('returns an empty flow when nothing matches', () => {
    const flow = resolveCanvasSearch(graph, 'kafka');
    expect(flow?.nodeIds.size).toBe(0);
    expect(flow?.edgeIds.size).toBe(0);
  });

  it('matches case-insensitively and includes the whole flow of every match', () => {
    expect(nodeIdsOf(resolveCanvasSearch(graph, 'NGINX'))).toEqual(
      [
        configuredSourceNodeId('s1'),
        configuredSourceNodeId('s2'),
        configuredDestinationNodeId('d1'),
        configuredDestinationNodeId('d2'),
      ].sort()
    );
  });

  it('resolves a destination to the sources feeding it', () => {
    expect(nodeIdsOf(resolveCanvasSearch(graph, 'archive'))).toEqual(
      [configuredSourceNodeId('s1'), configuredDestinationNodeId('d1')].sort()
    );
  });

  it('matches on the subtitle too', () => {
    expect(nodeIdsOf(resolveCanvasSearch(graph, 'managed'))).toEqual(
      [configuredSourceNodeId('s2'), configuredDestinationNodeId('d2')].sort()
    );
  });
});

describe('applyCanvasSearch', () => {
  it('returns the same arrays when there is no flow', () => {
    const result = applyCanvasSearch(graph.nodes, graph.edges, undefined);
    expect(result.nodes).toBe(graph.nodes);
    expect(result.edges).toBe(graph.edges);
  });

  it('hides nodes and edges outside the flow but keeps placeholders visible', () => {
    const flow = resolveCanvasSearch(graph, 'archive');
    const { nodes, edges } = applyCanvasSearch(graph.nodes, graph.edges, flow);

    expect(Object.fromEntries(nodes.map((node) => [node.id, node.hidden]))).toEqual({
      [configuredSourceNodeId('s1')]: false,
      [configuredSourceNodeId('s2')]: true,
      [configuredDestinationNodeId('d1')]: false,
      [configuredDestinationNodeId('d2')]: true,
      'new-1': false,
    });
    expect(Object.fromEntries(edges.map((item) => [item.id, item.hidden]))).toEqual({
      's1->d1': false,
      's1->d2': true,
      's2->d2': true,
    });
  });
});
