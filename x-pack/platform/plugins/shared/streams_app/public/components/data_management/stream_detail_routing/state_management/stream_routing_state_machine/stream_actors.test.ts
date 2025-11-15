/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoutingDefinition, Streams } from '@kbn/streams-schema';
import { buildRoutingSaveRequest } from './stream_actors';

describe('buildRoutingSaveRequest', () => {
  it('builds a routing request payload', () => {
    const definition = createDefinition('example-stream');
    const routing: RoutingDefinition[] = [
      {
        destination: 'example-stream.child',
        status: 'enabled',
        where: { equals: { field: 'service.name', value: 'frontend' } },
      },
    ];

    const request = buildRoutingSaveRequest(definition, routing);

    expect(request.method).toBe('PUT');
    expect(request.url).toBe('/api/streams/example-stream/_ingest');
    expect(request.body.ingest.wired.routing).toBe(routing);
  });
});

const createDefinition = (name: string): Streams.WiredStream.GetResponse =>
  ({
    stream: {
      name,
      ingest: {
        processing: [],
        wired: {
          fields: {},
          routing: [],
        },
      },
    },
  } as unknown as Streams.WiredStream.GetResponse);
