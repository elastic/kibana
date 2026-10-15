/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createClassicStreamDefinition } from '../shared/mocks/stream_definitions';
import { DATA_STREAMS_NODE_ID } from './build_data_streams';
import { buildClassicStreamsGraph } from './build_graph';
import { getUnownedClassicStreams } from './classic_stream_coverage';
import { DATA_STREAMS_NODE_TYPE, DESTINATION_NODE_TYPE, SOURCE_NODE_TYPE } from './types';

describe('buildClassicStreamsGraph', () => {
  it('returns no nodes or edges for an empty list', () => {
    expect(buildClassicStreamsGraph([])).toEqual({ nodes: [], edges: [] });
  });

  it('collapses classic streams into one Data streams hub', () => {
    const { nodes, edges } = buildClassicStreamsGraph([
      createClassicStreamDefinition('logs-nginx-default'),
      createClassicStreamDefinition('logs-apache-default'),
    ]);

    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
    expect(nodes[0]).toMatchObject({
      id: DATA_STREAMS_NODE_ID,
      type: DATA_STREAMS_NODE_TYPE,
      data: {
        title: 'Data streams',
        count: 2,
        expanded: false,
      },
    });
    expect(nodes.some((node) => node.type === SOURCE_NODE_TYPE)).toBe(false);
    expect(nodes.some((node) => node.type === DESTINATION_NODE_TYPE)).toBe(false);
  });

  it('fans destination cards out from the hub when expanded', () => {
    const { nodes, edges } = buildClassicStreamsGraph(
      [
        createClassicStreamDefinition('logs-nginx-default'),
        createClassicStreamDefinition('logs-with-processing', { withProcessing: true }),
      ],
      { expanded: true }
    );

    expect(nodes.some((node) => node.type === SOURCE_NODE_TYPE)).toBe(false);
    expect(nodes.filter((node) => node.type === DESTINATION_NODE_TYPE)).toHaveLength(2);
    expect(edges).toHaveLength(2);

    const hub = nodes.find((node) => node.type === DATA_STREAMS_NODE_TYPE);
    const destinations = nodes.filter((node) => node.type === DESTINATION_NODE_TYPE);
    expect(hub).toMatchObject({
      id: DATA_STREAMS_NODE_ID,
      data: { count: 2, expanded: true },
    });
    expect(destinations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'destination-logs-nginx-default',
          data: expect.objectContaining({
            streamName: 'logs-nginx-default',
            hasProcessing: false,
          }),
        }),
        expect.objectContaining({
          id: 'destination-logs-with-processing',
          data: expect.objectContaining({
            streamName: 'logs-with-processing',
            hasProcessing: true,
          }),
        }),
      ])
    );
    expect(edges.map((edge) => edge.source)).toEqual([DATA_STREAMS_NODE_ID, DATA_STREAMS_NODE_ID]);

    destinations.forEach((destination) => {
      expect(hub?.position.x).toBeLessThan(destination.position.x);
    });
  });

  it('does not fan out classics already covered by a unit destination', () => {
    const unmatched = getUnownedClassicStreams(
      [
        createClassicStreamDefinition('logs-nginx-default'),
        createClassicStreamDefinition('metrics-cpu-default'),
      ],
      [{ signal: 'logs', mode: 'auto' }]
    );
    const { nodes } = buildClassicStreamsGraph(unmatched, { expanded: true });

    expect(nodes).toHaveLength(2);
    expect(nodes.map((node) => node.data.streamName ?? node.data.title)).toEqual([
      'Data streams',
      'metrics-cpu-default',
    ]);
  });

  it('gives every node a screen-reader aria-label', () => {
    const collapsed = buildClassicStreamsGraph([
      createClassicStreamDefinition('logs-nginx-default'),
    ]);
    expect(collapsed.nodes[0].ariaLabel).toBe(
      'Data streams, 1 not matched by unit destination patterns, collapsed'
    );

    const { nodes } = buildClassicStreamsGraph(
      [
        createClassicStreamDefinition('logs-nginx-default'),
        createClassicStreamDefinition('logs-with-processing', { withProcessing: true }),
      ],
      { expanded: true }
    );
    const byId = new Map(nodes.map((node) => [node.id, node]));

    expect(byId.get(DATA_STREAMS_NODE_ID)?.ariaLabel).toBe(
      'Data streams, 2 not matched by unit destination patterns, expanded'
    );
    expect(byId.get('destination-logs-nginx-default')?.ariaLabel).toBe(
      'Destination: logs-nginx-default'
    );
    expect(byId.get('destination-logs-with-processing')?.ariaLabel).toBe(
      'Destination: logs-with-processing, with processing'
    );
  });
});
