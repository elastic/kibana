/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createClassicStreamDefinition } from '../shared/mocks/stream_definitions';
import { getDestinationNodeId } from './build_destination';
import { BULK_SOURCE_SUBTITLE } from './build_source';
import {
  buildClassicStreamElements,
  buildClassicStreamsGraph,
  getCanvasDestinationNames,
} from './build_graph';
import { DESTINATION_NODE_TYPE, SOURCE_NODE_TYPE } from './types';

describe('buildClassicStreamsGraph', () => {
  it('returns no nodes or edges for an empty list', () => {
    expect(buildClassicStreamsGraph([])).toEqual({ nodes: [], edges: [] });
  });

  it('builds a source -> destination pair with an edge for a single stream', () => {
    const { nodes, edges } = buildClassicStreamsGraph([
      createClassicStreamDefinition('logs-nginx-default'),
    ]);

    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);

    const [source, destination] = nodes;
    expect(source).toMatchObject({
      id: 'source-logs-nginx-default',
      type: SOURCE_NODE_TYPE,
      data: { title: 'logs-nginx-default', subtitle: BULK_SOURCE_SUBTITLE },
    });
    expect(destination).toMatchObject({
      id: 'destination-logs-nginx-default',
      type: DESTINATION_NODE_TYPE,
      data: {
        streamName: 'logs-nginx-default',
        title: 'logs-nginx-default',
        hasProcessing: false,
      },
    });
    expect(edges[0]).toMatchObject({
      source: 'source-logs-nginx-default',
      target: 'destination-logs-nginx-default',
    });

    // The auto-layout always places the source to the left of its destination.
    expect(source.position.x).toBeLessThan(destination.position.x);
  });

  it('keeps the destination processing trigger available for classic streams', () => {
    const { nodes } = buildClassicStreamsGraph([
      createClassicStreamDefinition('logs-with-processing', { withProcessing: true }),
    ]);

    const destination = nodes.find((node) => node.type === DESTINATION_NODE_TYPE);
    expect(destination?.data.hasProcessing).toBe(true);
  });

  it('renders one pair per stream and stacks them on separate rows', () => {
    const { nodes, edges } = buildClassicStreamsGraph([
      createClassicStreamDefinition('logs-a'),
      createClassicStreamDefinition('logs-b'),
    ]);

    expect(nodes).toHaveLength(4);
    expect(edges).toHaveLength(2);

    const sources = nodes.filter((node) => node.type === SOURCE_NODE_TYPE);
    expect(sources[0].position.y).not.toEqual(sources[1].position.y);
  });

  it('gives every node a screen-reader aria-label', () => {
    const { nodes } = buildClassicStreamsGraph([
      createClassicStreamDefinition('logs-nginx-default'),
      createClassicStreamDefinition('logs-with-processing', { withProcessing: true }),
    ]);

    const byId = new Map(nodes.map((node) => [node.id, node]));

    expect(byId.get('source-logs-nginx-default')?.ariaLabel).toBe(
      'Source: logs-nginx-default, async bulk ingest'
    );
    expect(byId.get('destination-logs-nginx-default')?.ariaLabel).toBe(
      'Destination: logs-nginx-default'
    );
    expect(byId.get('destination-logs-with-processing')?.ariaLabel).toBe(
      'Destination: logs-with-processing, with processing'
    );
  });
});

describe('getCanvasDestinationNames', () => {
  it('matches destination nodes produced by the element builder', () => {
    const streams = [
      createClassicStreamDefinition('logs-a'),
      createClassicStreamDefinition('logs-b'),
    ];
    const { nodes } = buildClassicStreamElements(streams);
    const fromNodes = new Set(
      nodes
        .filter((node) => node.type === DESTINATION_NODE_TYPE)
        .map((node) => node.data.streamName)
    );

    expect(getCanvasDestinationNames(streams)).toEqual(fromNodes);
    expect(getCanvasDestinationNames(streams)).toEqual(new Set(['logs-a', 'logs-b']));
  });

  it('returns an empty set when there are no streams', () => {
    expect(getCanvasDestinationNames([])).toEqual(new Set());
  });
});

describe('getDestinationNodeId', () => {
  it('keys destination nodes by stream name', () => {
    expect(getDestinationNodeId('logs-nginx-default')).toBe('destination-logs-nginx-default');
  });
});
