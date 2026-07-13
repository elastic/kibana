/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { createMockClassicStreamDefinition } from '../shared/mocks/stream_definitions';
import {
  BULK_SOURCE_SUBTITLE,
  buildClassicStreamsGraph,
  hasProcessing,
  inferSource,
} from './build_graph';
import { DESTINATION_NODE_TYPE, SOURCE_NODE_TYPE } from './types';

const createClassicDefinition = (
  name: string,
  { withProcessing = false }: { withProcessing?: boolean } = {}
): Streams.ClassicStream.Definition => {
  const { stream } = createMockClassicStreamDefinition();
  return {
    ...stream,
    name,
    ingest: {
      ...stream.ingest,
      processing: {
        steps: withProcessing ? [{ action: 'set', to: 'test_field', value: 'test_value' }] : [],
        updated_at: stream.ingest.processing.updated_at,
      },
    },
  };
};

describe('buildClassicStreamsGraph', () => {
  it('returns no nodes or edges for an empty list', () => {
    expect(buildClassicStreamsGraph([])).toEqual({ nodes: [], edges: [] });
  });

  it('builds a source -> destination pair with an edge for a single stream', () => {
    const { nodes, edges } = buildClassicStreamsGraph([
      createClassicDefinition('logs-nginx-default'),
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
      data: { title: 'logs-nginx-default', hasProcessing: false },
    });
    expect(edges[0]).toMatchObject({
      source: 'source-logs-nginx-default',
      target: 'destination-logs-nginx-default',
    });
  });

  it('flags the destination as having processing when the stream has Streamlang steps', () => {
    const { nodes } = buildClassicStreamsGraph([
      createClassicDefinition('logs-with-processing', { withProcessing: true }),
    ]);

    const destination = nodes.find((node) => node.type === DESTINATION_NODE_TYPE);
    expect(destination?.data.hasProcessing).toBe(true);
  });

  it('renders one pair per stream and stacks them on separate rows', () => {
    const { nodes, edges } = buildClassicStreamsGraph([
      createClassicDefinition('logs-a'),
      createClassicDefinition('logs-b'),
    ]);

    expect(nodes).toHaveLength(4);
    expect(edges).toHaveLength(2);

    const sources = nodes.filter((node) => node.type === SOURCE_NODE_TYPE);
    expect(sources[0].position.y).not.toEqual(sources[1].position.y);
  });
});

describe('inferSource', () => {
  it('labels the inferred source from the stream name with a _bulk subtitle', () => {
    expect(inferSource(createClassicDefinition('logs-nginx-default'))).toEqual({
      title: 'logs-nginx-default',
      subtitle: BULK_SOURCE_SUBTITLE,
      iconType: 'push',
    });
  });
});

describe('hasProcessing', () => {
  it('is false when there are no processing steps', () => {
    expect(hasProcessing(createClassicDefinition('logs-a'))).toBe(false);
  });

  it('is true when there is at least one processing step', () => {
    expect(hasProcessing(createClassicDefinition('logs-a', { withProcessing: true }))).toBe(true);
  });
});
