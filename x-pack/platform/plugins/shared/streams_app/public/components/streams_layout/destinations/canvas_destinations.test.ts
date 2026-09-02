/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import { initialNodes } from '../../stream_list_view/canvas/seed-graph';
import type { DestinationNodeData } from '../../stream_list_view/canvas/types';
import {
  getCanvasSeedDestinations,
  getMockDestinationGetResponse,
  isCanvasSeedDestinationName,
  mergeLiveAndCanvasDestinations,
} from './canvas_destinations';
import type { Destination } from './types';

const canvasDestinationNames = initialNodes
  .filter((node) => node.type === 'destination')
  .map((node) => (node.data as DestinationNodeData).title);

describe('canvas destinations', () => {
  it('includes every configured destination from the canvas seed graph', () => {
    const names = getCanvasSeedDestinations().map((destination) => destination.name);

    expect(names).toEqual(expect.arrayContaining(canvasDestinationNames));
    expect(names).toHaveLength(canvasDestinationNames.length);
  });

  it('marks the S3 archive as an external destination', () => {
    const archive = getCanvasSeedDestinations().find(
      (destination) => destination.name === 'logs-archive.cold'
    );

    expect(archive).toMatchObject({
      type: 's3',
      isInternal: false,
      hasDataStream: false,
    });
  });

  it('does not duplicate a canvas destination that already exists live', () => {
    const live: Destination[] = [
      {
        ...getCanvasSeedDestinations()[0],
        description: 'from the streams API',
      },
    ];

    const merged = mergeLiveAndCanvasDestinations(live);
    const matches = merged.filter((destination) => destination.name === live[0].name);

    expect(matches).toHaveLength(1);
    expect(matches[0].description).toBe('from the streams API');
    expect(merged.length).toBe(live.length + canvasDestinationNames.length - 1);
  });

  it('builds a classic GetResponse for a canvas-only destination', () => {
    expect(isCanvasSeedDestinationName('logs-archive.cold')).toBe(true);
    expect(isCanvasSeedDestinationName('not-a-canvas-destination')).toBe(false);

    const response = getMockDestinationGetResponse('logs-archive.cold');

    if (!response) {
      throw new Error('Expected a mock GetResponse for a canvas destination');
    }
    expect(Streams.ClassicStream.GetResponse.is(response)).toBe(true);
    expect(getMockDestinationGetResponse('not-a-canvas-destination')).toBeUndefined();
  });
});
