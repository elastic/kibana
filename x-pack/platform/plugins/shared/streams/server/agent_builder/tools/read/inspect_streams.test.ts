/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInspectStreamsTool } from './inspect_streams';
import { createMockGetScopedClients, createMockToolContext } from '../../utils/test_helpers';

const wiredStreamDef = (
  name: string,
  steps: object[] = [],
  fields: Record<string, { type: string }> = { 'log.level': { type: 'keyword' } }
) => ({
  name,
  description: `${name} stream`,
  ingest: {
    wired: { fields, routing: [] },
    processing: { steps },
    lifecycle: { inherit: {} },
    failure_store: { inherit: {} },
  },
});

const classicStreamDef = (name: string, steps: object[] = []) => ({
  name,
  description: `${name} stream`,
  ingest: {
    classic: { field_overrides: { message: { type: 'text' } } },
    processing: { steps },
    lifecycle: { inherit: {} },
    failure_store: { inherit: {} },
  },
});

describe('createInspectStreamsTool handler', () => {
  const setup = () => {
    const { getScopedClients, streamsClient, esClient, scopedClusterClient } =
      createMockGetScopedClients();
    const tool = createInspectStreamsTool({ getScopedClients, isServerless: false });
    const context = createMockToolContext();
    return { tool, context, streamsClient, esClient, scopedClusterClient };
  };

  it('returns overview for a single stream', async () => {
    const { tool, context, streamsClient } = setup();
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.nginx') as any);
    streamsClient.getAncestors.mockResolvedValue([]);

    const result = await tool.handler(
      { names: ['logs.ecs.nginx'], aspects: ['overview'] },
      context
    );

    if ('results' in result) {
      const data = result.results[0].data as Record<string, any>;
      expect(data.streams['logs.ecs.nginx']).toBeDefined();
      expect(data.streams['logs.ecs.nginx'].type).toBe('wired');
      expect(data.streams['logs.ecs.nginx'].overview.name).toBe('logs.ecs.nginx');
    }
  });

  it('resolves ["*"] to all existing streams', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.listStreamsWithDataStreamExistence.mockResolvedValue([
      { exists: true, stream: wiredStreamDef('logs.ecs.a') },
      { exists: true, stream: classicStreamDef('logs-nginx.data-default') },
      { exists: false, stream: wiredStreamDef('logs.ecs.missing') },
    ] as any);

    streamsClient.getStream
      .mockResolvedValueOnce(wiredStreamDef('logs.ecs.a') as any)
      .mockResolvedValueOnce(classicStreamDef('logs-nginx.data-default') as any);

    const result = await tool.handler({ names: ['*'], aspects: ['overview'] }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, any>;
      expect(Object.keys(data.streams)).toHaveLength(2);
      expect(data.streams['logs.ecs.a'].type).toBe('wired');
      expect(data.streams['logs-nginx.data-default'].type).toBe('classic');
    }
  });

  it('returns processing_chain with source attribution for wired streams', async () => {
    const { tool, context, streamsClient } = setup();

    const steps = [
      { action: 'grok', from: 'message', patterns: ['%{COMBINEDAPACHELOG}'] },
      { action: 'remove', from: 'message' },
    ];
    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.nginx', steps) as any);
    streamsClient.getAncestors.mockResolvedValue([]);

    const result = await tool.handler(
      { names: ['logs.ecs.nginx'], aspects: ['processing'] },
      context
    );

    if ('results' in result) {
      const data = result.results[0].data as Record<string, any>;
      const proc = data.streams['logs.ecs.nginx'].processing;
      expect(proc.own_step_count).toBe(2);
      expect(proc.processing_chain).toEqual([{ source: 'logs.ecs.nginx', steps }]);
    }
  });

  it('includes ancestor steps in processing_chain for wired streams', async () => {
    const { tool, context, streamsClient } = setup();

    const parentSteps = [{ action: 'date', from: 'timestamp', formats: ['ISO8601'] }];
    const ownSteps = [{ action: 'grok', from: 'message' }];

    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.nginx', ownSteps) as any);
    streamsClient.getAncestors.mockResolvedValue([wiredStreamDef('logs.ecs', parentSteps)] as any);

    const result = await tool.handler(
      { names: ['logs.ecs.nginx'], aspects: ['processing'] },
      context
    );

    if ('results' in result) {
      const data = result.results[0].data as Record<string, any>;
      const proc = data.streams['logs.ecs.nginx'].processing;
      expect(proc.processing_chain).toEqual([
        { source: 'logs.ecs', steps: parentSteps },
        { source: 'logs.ecs.nginx', steps: ownSteps },
      ]);
      expect(proc.own_step_count).toBe(1);
    }
  });

  it('returns single-entry processing_chain for classic streams', async () => {
    const { tool, context, streamsClient } = setup();

    const steps = [{ action: 'grok', from: 'message' }];
    streamsClient.getStream.mockResolvedValue(classicStreamDef('logs-nginx', steps) as any);

    const result = await tool.handler({ names: ['logs-nginx'], aspects: ['processing'] }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, any>;
      const proc = data.streams['logs-nginx'].processing;
      expect(proc.processing_chain).toEqual([{ source: 'logs-nginx', steps }]);
      expect(proc.own_step_count).toBe(1);
    }
  });

  it('omits processing for query streams', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'query.test',
      description: 'test',
      query: { esql: 'FROM logs' },
    } as any);

    const result = await tool.handler({ names: ['query.test'], aspects: ['processing'] }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, any>;
      expect(data.streams['query.test'].processing).toBeUndefined();
    }
  });

  it('includes type_context per stream type', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'query.test',
      description: 'test',
      query: { esql: 'FROM logs' },
    } as any);

    const result = await tool.handler({ names: ['query.test'], aspects: ['overview'] }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, any>;
      expect(data.streams['query.test'].type).toBe('query');
      expect(data.streams['query.test'].type_context).toContain('Read-only');
    }
  });

  it('handles errors for individual streams gracefully', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream
      .mockResolvedValueOnce(wiredStreamDef('logs.ecs.good') as any)
      .mockRejectedValueOnce(new Error('Cannot find stream logs.ecs.bad'));

    const result = await tool.handler(
      { names: ['logs.ecs.good', 'logs.ecs.bad'], aspects: ['overview'] },
      context
    );

    if ('results' in result) {
      const data = result.results[0].data as Record<string, any>;
      expect(data.streams['logs.ecs.good'].type).toBe('wired');
      expect(data.streams['logs.ecs.bad'].error).toContain('Cannot find stream');
    }
  });

  it('returns empty result when no streams exist', async () => {
    const { tool, context, streamsClient } = setup();
    streamsClient.listStreamsWithDataStreamExistence.mockResolvedValue([]);

    const result = await tool.handler({ names: ['*'], aspects: ['overview'] }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, any>;
      expect(data.summary).toBe('No streams found.');
      expect(Object.keys(data.streams)).toHaveLength(0);
    }
  });

  describe('classic stream schema aspect with fieldCaps', () => {
    const classicWithOverrides = (
      name: string,
      overrides: Record<string, { type: string }> = {}
    ) => ({
      name,
      description: `${name} stream`,
      ingest: {
        classic: { field_overrides: overrides },
        processing: { steps: [] },
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
      },
    });

    interface SchemaField {
      name: string;
      type: string;
      source: string;
      overridable?: boolean;
    }

    interface SchemaResult {
      mapped_fields: SchemaField[];
      unmapped_fields: string[];
      total_mapped: number;
      total_unmapped: number;
    }

    const mockFieldCaps = (
      fields: Record<string, Record<string, { type: string; metadata_field?: boolean }>>
    ) => ({
      indices: ['.ds-test-index'],
      fields,
    });

    const getSchema = (result: Record<string, unknown>, streamName: string): SchemaResult => {
      if (!('results' in result)) throw new Error('Expected results');
      const data = (result as { results: Array<{ data: Record<string, unknown> }> }).results[0]
        .data as { streams: Record<string, { schema: SchemaResult }> };
      return data.streams[streamName].schema;
    };

    it('shows ES-mapped fields with source "index_template" for classic streams', async () => {
      const { tool, context, streamsClient, esClient } = setup();
      streamsClient.getStream.mockResolvedValue(classicWithOverrides('logs-otel') as never);
      esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      esClient.fieldCaps.mockResolvedValue(
        mockFieldCaps({
          trace_id: { trace_id: { type: 'keyword' } },
          '@timestamp': { '@timestamp': { type: 'date' } },
        }) as never
      );

      const result = await tool.handler({ names: ['logs-otel'], aspects: ['schema'] }, context);
      const schema = getSchema(result, 'logs-otel');

      expect(schema.mapped_fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'trace_id',
            type: 'keyword',
            source: 'index_template',
            overridable: true,
          }),
          expect.objectContaining({
            name: '@timestamp',
            type: 'date',
            source: 'index_template',
            overridable: true,
          }),
        ])
      );
      expect(schema.unmapped_fields).toEqual([]);
    });

    it('marks non-Streams types as overridable: false', async () => {
      const { tool, context, streamsClient, esClient } = setup();
      streamsClient.getStream.mockResolvedValue(classicWithOverrides('logs-otel') as never);
      esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      esClient.fieldCaps.mockResolvedValue(
        mockFieldCaps({
          'data_stream.type': { 'data_stream.type': { type: 'constant_keyword' } },
          trace_id: { trace_id: { type: 'keyword' } },
          'scope.version': { 'scope.version': { type: 'version' } },
        }) as never
      );

      const result = await tool.handler({ names: ['logs-otel'], aspects: ['schema'] }, context);
      const schema = getSchema(result, 'logs-otel');

      const dsType = schema.mapped_fields.find((f) => f.name === 'data_stream.type');
      expect(dsType).toEqual(
        expect.objectContaining({
          type: 'constant_keyword',
          source: 'index_template',
          overridable: false,
        })
      );
      const version = schema.mapped_fields.find((f) => f.name === 'scope.version');
      expect(version).toEqual(expect.objectContaining({ type: 'version', overridable: true }));
    });

    it('shows field_overrides as Streams-managed with stream name as source', async () => {
      const { tool, context, streamsClient, esClient } = setup();
      streamsClient.getStream.mockResolvedValue(
        classicWithOverrides('logs-otel', { my_field: { type: 'keyword' } }) as never
      );
      esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      esClient.fieldCaps.mockResolvedValue(
        mockFieldCaps({
          my_field: { my_field: { type: 'keyword' } },
          trace_id: { trace_id: { type: 'keyword' } },
        }) as never
      );

      const result = await tool.handler({ names: ['logs-otel'], aspects: ['schema'] }, context);
      const schema = getSchema(result, 'logs-otel');

      const myField = schema.mapped_fields.find((f) => f.name === 'my_field');
      expect(myField).toEqual(
        expect.objectContaining({
          name: 'my_field',
          type: 'keyword',
          source: 'logs-otel',
        })
      );
      expect(myField?.overridable).toBeUndefined();
    });

    it('reports truly unmapped fields from _source samples', async () => {
      const { tool, context, streamsClient, esClient } = setup();
      streamsClient.getStream.mockResolvedValue(classicWithOverrides('logs-otel') as never);
      esClient.search.mockResolvedValue({
        hits: { hits: [{ _source: { trace_id: 'abc', dynamic_field: 'hello' } }] },
      } as never);
      esClient.fieldCaps.mockResolvedValue(
        mockFieldCaps({
          trace_id: { trace_id: { type: 'keyword' } },
        }) as never
      );

      const result = await tool.handler({ names: ['logs-otel'], aspects: ['schema'] }, context);
      const schema = getSchema(result, 'logs-otel');

      expect(schema.unmapped_fields).toEqual(['dynamic_field']);
      expect(schema.mapped_fields.find((f) => f.name === 'trace_id')).toBeDefined();
    });

    it('filters out metadata and multi-field sub-paths from fieldCaps', async () => {
      const { tool, context, streamsClient, esClient } = setup();
      streamsClient.getStream.mockResolvedValue(classicWithOverrides('logs-otel') as never);
      esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      esClient.fieldCaps.mockResolvedValue(
        mockFieldCaps({
          _id: { _id: { type: 'keyword', metadata_field: true } },
          trace_id: { trace_id: { type: 'keyword' } },
          'trace_id.keyword': { 'trace_id.keyword': { type: 'keyword' } },
          'message.text': { 'message.text': { type: 'match_only_text' } },
        }) as never
      );

      const result = await tool.handler({ names: ['logs-otel'], aspects: ['schema'] }, context);
      const schema = getSchema(result, 'logs-otel');

      const names = schema.mapped_fields.map((f) => f.name);
      expect(names).toContain('trace_id');
      expect(names).not.toContain('_id');
      expect(names).not.toContain('trace_id.keyword');
      expect(names).not.toContain('message.text');
    });

    it('does not use fieldCaps for wired streams', async () => {
      const { tool, context, streamsClient, esClient } = setup();
      streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs.ecs.nginx') as never);
      streamsClient.getAncestors.mockResolvedValue([]);
      esClient.search.mockResolvedValue({ hits: { hits: [] } } as never);

      const result = await tool.handler(
        { names: ['logs.ecs.nginx'], aspects: ['schema'] },
        context
      );

      expect(esClient.fieldCaps).not.toHaveBeenCalled();
      const schema = getSchema(result, 'logs.ecs.nginx');
      expect(schema.mapped_fields).toBeDefined();
    });
  });
});
