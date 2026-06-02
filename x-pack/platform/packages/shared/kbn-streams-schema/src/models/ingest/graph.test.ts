/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GraphStream } from './graph';
import { Streams } from '../streams';
import {
  convertUpsertRequestIntoDefinition,
  convertGetResponseIntoUpsertRequest,
} from '../../helpers/converters';

const now = '2024-01-01T00:00:00.000Z';

const serviceAParseDefinition: GraphStream.Definition = {
  type: 'graph',
  name: 'serviceA_parse',
  description: 'Parses serviceA logs',
  updated_at: now,
  ingest: {
    lifecycle: { dsl: { data_retention: '7d' } },
    processing: {
      steps: [],
      updated_at: now,
    },
    settings: {},
    graph: {
      fields: {
        'attributes.client_ip': { type: 'ip' },
        'attributes.method': { type: 'keyword' },
      },
      routing: [
        {
          destination: 'nginx_es',
          where: { field: 'host.name', eq: 'nginx' },
          status: 'enabled',
        },
        {
          destination: 'serviceA_es',
          where: { always: {} }, // unconditional fallthrough — always routes if no prior match
          status: 'enabled',
        },
      ],
    },
    failure_store: { inherit: {} },
  },
};

describe('GraphStream schema', () => {
  describe('Definition', () => {
    it('parses a valid graph-stream definition', () => {
      const parsed = GraphStream.Definition.parse(serviceAParseDefinition);
      expect(parsed.type).toBe('graph');
      expect(parsed.ingest.graph.routing).toHaveLength(2);
    });

    it('discriminates graph from wired and classic', () => {
      expect(GraphStream.Definition.is(serviceAParseDefinition)).toBe(true);
      expect(Streams.WiredStream.Definition.is(serviceAParseDefinition)).toBe(false);
      expect(Streams.ClassicStream.Definition.is(serviceAParseDefinition)).toBe(false);
    });

    it('is recognised by Streams.all.Definition', () => {
      expect(Streams.all.Definition.is(serviceAParseDefinition)).toBe(true);
    });
  });

  describe('UpsertRequest round-trip', () => {
    it('convertUpsertRequestIntoDefinition + convertGetResponseIntoUpsertRequest round-trips', () => {
      const upsertRequest: GraphStream.UpsertRequest = {
        dashboards: [],
        rules: [],
        queries: [],
        stream: {
          type: 'graph',
          description: serviceAParseDefinition.description,
          ingest: {
            lifecycle: serviceAParseDefinition.ingest.lifecycle,
            processing: { steps: [] },
            settings: {},
            graph: serviceAParseDefinition.ingest.graph,
            failure_store: serviceAParseDefinition.ingest.failure_store,
          },
        },
      };

      const definition = convertUpsertRequestIntoDefinition('serviceA_parse', upsertRequest);
      expect(definition.name).toBe('serviceA_parse');
      expect(definition.type).toBe('graph');
      expect(Streams.GraphStream.Definition.is(definition)).toBe(true);

      const getResponse: GraphStream.GetResponse = {
        stream: definition as GraphStream.Definition,
        dashboards: [],
        rules: [],
        queries: [],
        privileges: {
          manage: true,
          monitor: true,
          view_index_metadata: true,
          lifecycle: true,
          simulate: true,
          text_structure: true,
          read_failure_store: false,
          manage_failure_store: false,
          create_snapshot_repository: false,
        },
        data_stream_exists: false,
      };

      const roundTripped = convertGetResponseIntoUpsertRequest(getResponse);
      expect(roundTripped.stream.type).toBe('graph');
      expect(Streams.GraphStream.UpsertRequest.is(roundTripped)).toBe(true);
    });
  });
});
