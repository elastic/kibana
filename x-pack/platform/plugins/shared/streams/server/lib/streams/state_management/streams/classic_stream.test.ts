/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { ClassicStream } from './classic_stream';
import type { StateDependencies, StreamChange } from '../types';
import type { State } from '../state';
import type { StreamChangeStatus } from '../stream_active_record/stream_active_record';

interface ClassicStreamChanges {
  processing: boolean;
  field_overrides: boolean;
  failure_store: boolean;
  lifecycle: boolean;
  settings: boolean;
  query_streams: boolean;
}

interface ClassicStreamTestable {
  _changes: ClassicStreamChanges;
  doHandleUpsertChange(
    definition: Streams.all.Definition,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }>;
}

describe('ClassicStream', () => {
  const createMockDependencies = (): StateDependencies =>
    ({
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      isServerless: false,
      isDev: false,
      scopedClusterClient: {
        asCurrentUser: {
          indices: {
            getDataStreamSettings: jest.fn().mockResolvedValue({
              data_streams: [
                {
                  name: 'logs-test-default',
                  effective_settings: {
                    index: {},
                  },
                },
              ],
            }),
          },
        },
      },
    } as unknown as StateDependencies);

  const createMockState = (
    streams: Map<string, { definition: Streams.all.Definition }> = new Map()
  ): State =>
    ({
      get: (name: string) => streams.get(name),
      has: (name: string) => streams.has(name),
      all: () => Array.from(streams.values()),
    } as unknown as State);

  const createBaseClassicStreamDefinition = (
    overrides: Partial<Streams.ClassicStream.Definition> = {}
  ): Streams.ClassicStream.Definition => ({
    name: 'logs-test-default',
    description: 'Test stream',
    updated_at: new Date().toISOString(),
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [], updated_at: new Date().toISOString() },
      settings: {},
      classic: {
        field_overrides: undefined,
      },
      failure_store: { inherit: {} },
    },
    ...overrides,
  });

  describe('doHandleUpsertChange - _changes flags for new streams', () => {
    it('sets processing to false when processing.steps is empty for new stream', async () => {
      const definition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: undefined },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect((stream as unknown as ClassicStreamTestable)._changes.processing).toBe(false);
    });

    it('sets processing to true when processing.steps is non-empty for new stream', async () => {
      const definition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: {
            steps: [
              { action: 'grok', from: 'body.text', patterns: ['%{GREEDYDATA:attributes.data}'] },
            ],
            updated_at: new Date().toISOString(),
          },
          settings: {},
          classic: { field_overrides: undefined },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect((stream as unknown as ClassicStreamTestable)._changes.processing).toBe(true);
    });

    it('sets lifecycle to false when using inherit lifecycle for new stream', async () => {
      const definition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: undefined },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect(stream.hasChangedLifecycle()).toBe(false);
    });

    it('sets lifecycle to true when using non-inherit lifecycle for new stream', async () => {
      const definition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { dsl: { data_retention: '30d' } },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: undefined },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect(stream.hasChangedLifecycle()).toBe(true);
    });

    it('sets settings to false when settings is empty for new stream', async () => {
      const definition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: undefined },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect((stream as unknown as ClassicStreamTestable)._changes.settings).toBe(false);
    });

    it('sets settings to true when settings is non-empty for new stream', async () => {
      const definition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: { 'index.refresh_interval': { value: '5s' } },
          classic: { field_overrides: undefined },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect((stream as unknown as ClassicStreamTestable)._changes.settings).toBe(true);
    });

    it('sets field_overrides to false when field_overrides is undefined for new stream', async () => {
      const definition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: undefined },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect((stream as unknown as ClassicStreamTestable)._changes.field_overrides).toBe(false);
    });

    it('sets field_overrides to false when field_overrides is empty object for new stream', async () => {
      const definition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: {} },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect((stream as unknown as ClassicStreamTestable)._changes.field_overrides).toBe(false);
    });

    it('sets field_overrides to true when field_overrides is non-empty for new stream', async () => {
      const definition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: { test_field: { type: 'keyword' } } },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect((stream as unknown as ClassicStreamTestable)._changes.field_overrides).toBe(true);
    });

    it('sets failure_store to false when using inherit failure_store for new stream', async () => {
      const definition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: undefined },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect((stream as unknown as ClassicStreamTestable)._changes.failure_store).toBe(false);
    });

    it('sets failure_store to true when using non-inherit failure_store for new stream', async () => {
      const definition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: undefined },
          failure_store: { lifecycle: { enabled: { data_retention: '7d' } } },
        },
      });

      const stream = new ClassicStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect((stream as unknown as ClassicStreamTestable)._changes.failure_store).toBe(true);
    });

    it('sets all _changes to false when creating stream with all empty/default values', async () => {
      const definition = createBaseClassicStreamDefinition();

      const stream = new ClassicStream(definition, createMockDependencies());
      const emptyState = createMockState();

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        definition,
        emptyState,
        emptyState
      );

      expect((stream as unknown as ClassicStreamTestable)._changes.processing).toBe(false);
      expect(stream.hasChangedLifecycle()).toBe(false);
      expect((stream as unknown as ClassicStreamTestable)._changes.settings).toBe(false);
      expect((stream as unknown as ClassicStreamTestable)._changes.field_overrides).toBe(false);
      expect((stream as unknown as ClassicStreamTestable)._changes.failure_store).toBe(false);
    });
  });

  describe('doHandleUpsertChange - _changes flags for existing streams', () => {
    it('sets processing to true when processing changed for existing stream', async () => {
      const existingDefinition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: undefined },
          failure_store: { inherit: {} },
        },
      });

      const newDefinition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: {
            steps: [
              { action: 'grok', from: 'body.text', patterns: ['%{GREEDYDATA:attributes.data}'] },
            ],
            updated_at: new Date().toISOString(),
          },
          settings: {},
          classic: { field_overrides: undefined },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(existingDefinition, createMockDependencies());
      const startingState = createMockState(
        new Map([['logs-test-default', { definition: existingDefinition }]])
      );

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        newDefinition,
        startingState,
        startingState
      );

      expect((stream as unknown as ClassicStreamTestable)._changes.processing).toBe(true);
    });

    it('sets processing to false when processing unchanged for existing stream', async () => {
      const definition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: {
            steps: [
              { action: 'grok', from: 'body.text', patterns: ['%{GREEDYDATA:attributes.data}'] },
            ],
            updated_at: '2024-01-01T00:00:00.000Z',
          },
          settings: {},
          classic: { field_overrides: undefined },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(definition, createMockDependencies());
      const startingState = createMockState(new Map([['logs-test-default', { definition }]]));

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        definition,
        startingState,
        startingState
      );

      expect((stream as unknown as ClassicStreamTestable)._changes.processing).toBe(false);
    });

    it('sets lifecycle to true when lifecycle changed for existing stream', async () => {
      const existingDefinition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: undefined },
          failure_store: { inherit: {} },
        },
      });

      const newDefinition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { dsl: { data_retention: '30d' } },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: undefined },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(existingDefinition, createMockDependencies());
      const startingState = createMockState(
        new Map([['logs-test-default', { definition: existingDefinition }]])
      );

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        newDefinition,
        startingState,
        startingState
      );

      expect(stream.hasChangedLifecycle()).toBe(true);
    });

    it('sets lifecycle to false when lifecycle unchanged for existing stream', async () => {
      const definition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { dsl: { data_retention: '30d' } },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: undefined },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(definition, createMockDependencies());
      const startingState = createMockState(new Map([['logs-test-default', { definition }]]));

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        definition,
        startingState,
        startingState
      );

      expect(stream.hasChangedLifecycle()).toBe(false);
    });

    it('sets field_overrides to true when field_overrides changed for existing stream', async () => {
      const existingDefinition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: { old_field: { type: 'keyword' } } },
          failure_store: { inherit: {} },
        },
      });

      const newDefinition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: { new_field: { type: 'match_only_text' } } },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(existingDefinition, createMockDependencies());
      const startingState = createMockState(
        new Map([['logs-test-default', { definition: existingDefinition }]])
      );

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        newDefinition,
        startingState,
        startingState
      );

      expect((stream as unknown as ClassicStreamTestable)._changes.field_overrides).toBe(true);
    });

    it('sets field_overrides to false when field_overrides unchanged for existing stream', async () => {
      const definition = createBaseClassicStreamDefinition({
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          classic: { field_overrides: { test_field: { type: 'keyword' } } },
          failure_store: { inherit: {} },
        },
      });

      const stream = new ClassicStream(definition, createMockDependencies());
      const startingState = createMockState(new Map([['logs-test-default', { definition }]]));

      await (stream as unknown as ClassicStreamTestable).doHandleUpsertChange(
        definition,
        startingState,
        startingState
      );

      expect((stream as unknown as ClassicStreamTestable)._changes.field_overrides).toBe(false);
    });
  });
});
