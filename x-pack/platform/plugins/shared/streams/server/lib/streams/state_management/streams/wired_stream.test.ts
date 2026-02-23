/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { WiredStream } from './wired_stream';
import type { StateDependencies, StreamChange } from '../types';
import type { State } from '../state';
import type { StreamChangeStatus } from '../stream_active_record/stream_active_record';

interface WiredStreamChanges {
  ownFields: boolean;
  ownRouting: boolean;
  routing: boolean;
  processing: boolean;
  lifecycle: boolean;
  settings: boolean;
  failure_store: boolean;
}

interface WiredStreamTestable {
  _changes: WiredStreamChanges;
  doHandleUpsertChange(
    definition: Streams.all.Definition,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }>;
}

describe('WiredStream', () => {
  const createMockDependencies = (): StateDependencies =>
    ({
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      isServerless: false,
      isDev: false,
    } as unknown as StateDependencies);

  const createMockState = (
    streams: Map<string, { definition: Streams.all.Definition }> = new Map()
  ): State =>
    ({
      get: (name: string) => streams.get(name),
      has: (name: string) => streams.has(name),
      all: () => Array.from(streams.values()),
    } as unknown as State);

  const createBaseWiredStreamDefinition = (
    overrides: Partial<Streams.WiredStream.Definition> = {}
  ): Streams.WiredStream.Definition => ({
    name: 'logs.test',
    description: 'Test stream',
    updated_at: new Date().toISOString(),
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [], updated_at: new Date().toISOString() },
      settings: {},
      wired: {
        fields: {},
        routing: [],
      },
      failure_store: { inherit: {} },
    },
    ...overrides,
  });

  describe('doHandleUpsertChange - _changes flags for new streams', () => {
    it('sets ownFields to false when fields is empty for new stream', async () => {
      const definition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { inherit: {} },
        },
      });

      const stream = new WiredStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect(stream.hasChangedFields()).toBe(false);
    });

    it('sets ownFields to true when fields is non-empty for new stream', async () => {
      const definition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: {
            fields: { 'test.field': { type: 'keyword' } },
            routing: [],
          },
          failure_store: { inherit: {} },
        },
      });

      const stream = new WiredStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect(stream.hasChangedFields()).toBe(true);
    });

    it('sets routing to false when routing is empty for new stream', async () => {
      const definition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { inherit: {} },
        },
      });

      const stream = new WiredStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect((stream as unknown as WiredStreamTestable)._changes.routing).toBe(false);
    });

    it('sets routing to true when routing is non-empty for new stream', async () => {
      const definition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: {
            fields: {},
            routing: [{ destination: 'logs.test.child', where: { never: {} }, status: 'enabled' }],
          },
          failure_store: { inherit: {} },
        },
      });

      const stream = new WiredStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect((stream as unknown as WiredStreamTestable)._changes.routing).toBe(true);
    });

    it('sets processing to false when processing.steps is empty for new stream', async () => {
      const definition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { inherit: {} },
        },
      });

      const stream = new WiredStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect((stream as unknown as WiredStreamTestable)._changes.processing).toBe(false);
    });

    it('sets processing to true when processing.steps is non-empty for new stream', async () => {
      const definition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: {
            steps: [
              { action: 'grok', from: 'body.text', patterns: ['%{GREEDYDATA:attributes.data}'] },
            ],
            updated_at: new Date().toISOString(),
          },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { inherit: {} },
        },
      });

      const stream = new WiredStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect((stream as unknown as WiredStreamTestable)._changes.processing).toBe(true);
    });

    it('sets lifecycle to false when using inherit lifecycle for new stream', async () => {
      const definition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { inherit: {} },
        },
      });

      const stream = new WiredStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect(stream.hasChangedLifecycle()).toBe(false);
    });

    it('sets lifecycle to true when using non-inherit lifecycle for new stream', async () => {
      const definition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { dsl: { data_retention: '30d' } },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { inherit: {} },
        },
      });

      const stream = new WiredStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect(stream.hasChangedLifecycle()).toBe(true);
    });

    it('sets settings to false when settings is empty for new stream', async () => {
      const definition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { inherit: {} },
        },
      });

      const stream = new WiredStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect(stream.hasChangedSettings()).toBe(false);
    });

    it('sets settings to true when settings is non-empty for new stream', async () => {
      const definition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: { 'index.refresh_interval': { value: '5s' } },
          wired: { fields: {}, routing: [] },
          failure_store: { inherit: {} },
        },
      });

      const stream = new WiredStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect(stream.hasChangedSettings()).toBe(true);
    });

    it('sets failure_store to false when using inherit failure_store for new stream', async () => {
      const definition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { inherit: {} },
        },
      });

      const stream = new WiredStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect(stream.hasChangedFailureStore()).toBe(false);
    });

    it('sets failure_store to true when using non-inherit failure_store for new stream', async () => {
      const definition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { lifecycle: { enabled: { data_retention: '7d' } } },
        },
      });

      const stream = new WiredStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect(stream.hasChangedFailureStore()).toBe(true);
    });

    it('sets all _changes to false when creating stream with all empty/default values', async () => {
      const definition = createBaseWiredStreamDefinition();

      const stream = new WiredStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect(stream.hasChangedFields()).toBe(false);
      expect((stream as unknown as WiredStreamTestable)._changes.routing).toBe(false);
      expect((stream as unknown as WiredStreamTestable)._changes.processing).toBe(false);
      expect(stream.hasChangedLifecycle()).toBe(false);
      expect(stream.hasChangedSettings()).toBe(false);
      expect(stream.hasChangedFailureStore()).toBe(false);
    });
  });

  describe('doHandleUpsertChange - _changes flags for existing streams', () => {
    it('sets ownFields to true when fields changed for existing stream', async () => {
      const existingDefinition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: { 'old.field': { type: 'keyword' } }, routing: [] },
          failure_store: { inherit: {} },
        },
      });

      const newDefinition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: { 'new.field': { type: 'match_only_text' } }, routing: [] },
          failure_store: { inherit: {} },
        },
      });

      const stream = new WiredStream(existingDefinition, createMockDependencies());
      const startingState = createMockState(
        new Map([['logs.test', { definition: existingDefinition }]])
      );

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        newDefinition,
        startingState,
        startingState
      );

      expect(stream.hasChangedFields()).toBe(true);
    });

    it('sets ownFields to false when fields unchanged for existing stream', async () => {
      const definition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: { 'test.field': { type: 'keyword' } }, routing: [] },
          failure_store: { inherit: {} },
        },
      });

      const stream = new WiredStream(definition, createMockDependencies());
      const startingState = createMockState(new Map([['logs.test', { definition }]]));

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        definition,
        startingState,
        startingState
      );

      expect(stream.hasChangedFields()).toBe(false);
    });

    it('sets lifecycle to true when lifecycle changed for existing stream', async () => {
      const existingDefinition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { inherit: {} },
        },
      });

      const newDefinition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { dsl: { data_retention: '30d' } },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { inherit: {} },
        },
      });

      const stream = new WiredStream(existingDefinition, createMockDependencies());
      const startingState = createMockState(
        new Map([['logs.test', { definition: existingDefinition }]])
      );

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        newDefinition,
        startingState,
        startingState
      );

      expect(stream.hasChangedLifecycle()).toBe(true);
    });

    it('sets lifecycle to false when lifecycle unchanged for existing stream', async () => {
      const definition = createBaseWiredStreamDefinition({
        ingest: {
          lifecycle: { dsl: { data_retention: '30d' } },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { inherit: {} },
        },
      });

      const stream = new WiredStream(definition, createMockDependencies());
      const startingState = createMockState(new Map([['logs.test', { definition }]]));

      await (stream as unknown as WiredStreamTestable).doHandleUpsertChange(
        definition,
        startingState,
        startingState
      );

      expect(stream.hasChangedLifecycle()).toBe(false);
    });
  });
});
