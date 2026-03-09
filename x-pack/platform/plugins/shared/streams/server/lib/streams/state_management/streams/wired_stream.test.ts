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
import type { ElasticsearchAction } from '../execution_plan/types';

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
  doDetermineCreateActions(desiredState: State): Promise<ElasticsearchAction[]>;
  doDetermineDeleteActions(): Promise<ElasticsearchAction[]>;
}

describe('WiredStream', () => {
  const createMockDependencies = (): StateDependencies =>
    ({
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      isServerless: false,
      isWiredStreamViewsEnabled: true,
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

  describe('doDetermineCreateActions - ES|QL view', () => {
    const createMockDependenciesWithEs = (): StateDependencies =>
      ({
        logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        isServerless: false,
        isWiredStreamViewsEnabled: true,
        isDev: false,
        scopedClusterClient: {
          asCurrentUser: {
            indices: {
              getDataStream: jest.fn().mockResolvedValue({
                data_streams: [{ _meta: { managed_by: 'streams' } }],
              }),
            },
          },
        },
      } as unknown as StateDependencies);

    it('includes upsert_esql_view action with correct name and query', async () => {
      const definition = createBaseWiredStreamDefinition({
        name: 'logs.otel',
        ingest: {
          lifecycle: { dsl: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { lifecycle: { enabled: { data_retention: '30d' } } },
        },
      });
      const stream = new WiredStream(definition, createMockDependenciesWithEs());
      const desiredState = createMockState(new Map([['logs.otel', { definition }]]));

      const actions = await (stream as unknown as WiredStreamTestable).doDetermineCreateActions(
        desiredState
      );
      const viewAction = (actions as ElasticsearchAction[]).find(
        (a) => a.type === 'upsert_esql_view'
      ) as Extract<ElasticsearchAction, { type: 'upsert_esql_view' }> | undefined;

      expect(viewAction).toBeDefined();
      expect(viewAction?.request.name).toBe('$.logs.otel');
      expect(viewAction?.request.query).toBe('FROM logs.otel');
    });

    it('uses the stream name to build the view query', async () => {
      const rootDef = createBaseWiredStreamDefinition({
        name: 'logs.otel',
        ingest: {
          lifecycle: { dsl: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { lifecycle: { enabled: { data_retention: '30d' } } },
        },
      });
      const definition = createBaseWiredStreamDefinition({ name: 'logs.otel.nginx' });
      const stream = new WiredStream(definition, createMockDependenciesWithEs());
      const desiredState = createMockState(
        new Map([
          ['logs.otel', { definition: rootDef }],
          ['logs.otel.nginx', { definition }],
        ])
      );

      const actions = await (stream as unknown as WiredStreamTestable).doDetermineCreateActions(
        desiredState
      );
      const viewAction = (actions as ElasticsearchAction[]).find(
        (a) => a.type === 'upsert_esql_view'
      ) as Extract<ElasticsearchAction, { type: 'upsert_esql_view' }> | undefined;

      expect(viewAction?.request.name).toBe('$.logs.otel.nginx');
      expect(viewAction?.request.query).toBe('FROM logs.otel.nginx');
    });

    it('does not emit upsert_esql_view when isWiredStreamViewsEnabled is false', async () => {
      const definition = createBaseWiredStreamDefinition({
        name: 'logs.otel',
        ingest: {
          lifecycle: { dsl: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { lifecycle: { enabled: { data_retention: '30d' } } },
        },
      });
      const serverlessDeps = {
        ...createMockDependenciesWithEs(),
        isWiredStreamViewsEnabled: false,
      } as unknown as StateDependencies;
      const stream = new WiredStream(definition, serverlessDeps);
      const desiredState = createMockState(new Map([['logs.otel', { definition }]]));

      const actions = await (stream as unknown as WiredStreamTestable).doDetermineCreateActions(
        desiredState
      );
      const viewAction = actions.find((a) => a.type === 'upsert_esql_view');

      expect(viewAction).toBeUndefined();
    });
  });

  describe('doDetermineDeleteActions - ES|QL view', () => {
    it('includes delete_esql_view action with the correct view name', async () => {
      const definition = createBaseWiredStreamDefinition({ name: 'logs.otel' });
      const stream = new WiredStream(definition, createMockDependencies());

      const actions = await (stream as unknown as WiredStreamTestable).doDetermineDeleteActions();
      const viewAction = (actions as ElasticsearchAction[]).find(
        (a) => a.type === 'delete_esql_view'
      ) as Extract<ElasticsearchAction, { type: 'delete_esql_view' }> | undefined;

      expect(viewAction).toBeDefined();
      expect(viewAction?.request.name).toBe('$.logs.otel');
    });

    it('uses the stream name to build the delete view name', async () => {
      const definition = createBaseWiredStreamDefinition({ name: 'logs.otel.nginx' });
      const stream = new WiredStream(definition, createMockDependencies());

      const actions = await (stream as unknown as WiredStreamTestable).doDetermineDeleteActions();
      const viewAction = (actions as ElasticsearchAction[]).find(
        (a) => a.type === 'delete_esql_view'
      ) as Extract<ElasticsearchAction, { type: 'delete_esql_view' }> | undefined;

      expect(viewAction?.request.name).toBe('$.logs.otel.nginx');
    });

    it('does not emit delete_esql_view when isWiredStreamViewsEnabled is false', async () => {
      const definition = createBaseWiredStreamDefinition({ name: 'logs.otel' });
      const serverlessDeps = {
        ...createMockDependencies(),
        isWiredStreamViewsEnabled: false,
      } as unknown as StateDependencies;
      const stream = new WiredStream(definition, serverlessDeps);

      const actions = await (stream as unknown as WiredStreamTestable).doDetermineDeleteActions();
      const viewAction = actions.find((a) => a.type === 'delete_esql_view');

      expect(viewAction).toBeUndefined();
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

  describe('ES|QL view actions', () => {
    const createMockDependenciesWithEsClient = (): StateDependencies =>
      ({
        logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        isServerless: false,
        isWiredStreamViewsEnabled: true,
        isDev: false,
        scopedClusterClient: {
          asCurrentUser: {
            indices: {
              getDataStream: jest.fn().mockResolvedValue({
                data_streams: [{ _meta: { managed_by: 'streams' } }],
              }),
            },
          },
          asInternalUser: {},
        },
      } as unknown as StateDependencies);

    describe('doDetermineDeleteActions', () => {
      it('includes delete_esql_view for the stream view', async () => {
        const definition = createBaseWiredStreamDefinition({ name: 'logs.test' });
        const stream = new WiredStream(definition, createMockDependencies());

        const actions = await (stream as unknown as WiredStreamTestable).doDetermineDeleteActions();

        const deleteViewAction = actions.find(
          (a): a is Extract<ElasticsearchAction, { type: 'delete_esql_view' }> =>
            a.type === 'delete_esql_view'
        );
        expect(deleteViewAction).toBeDefined();
        expect(deleteViewAction?.request.name).toBe('$.logs.test');
      });
    });

    describe('doDetermineCreateActions', () => {
      const rootLogsDef = createBaseWiredStreamDefinition({
        name: 'logs',
        ingest: {
          lifecycle: { dsl: {} },
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { lifecycle: { enabled: { data_retention: '30d' } } },
        },
      });

      it('creates a view with only the stream itself when there are no children', async () => {
        const definition = createBaseWiredStreamDefinition({
          name: 'logs.test',
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [], updated_at: new Date().toISOString() },
            settings: {},
            wired: { fields: {}, routing: [] },
            failure_store: { inherit: {} },
          },
        });

        const deps = createMockDependenciesWithEsClient();
        const stream = new WiredStream(definition, deps);
        const desiredState = createMockState(
          new Map([
            ['logs', { definition: rootLogsDef }],
            ['logs.test', { definition }],
          ])
        );

        const actions = await (stream as unknown as WiredStreamTestable).doDetermineCreateActions(
          desiredState
        );

        const upsertViewAction = actions.find(
          (a): a is Extract<ElasticsearchAction, { type: 'upsert_esql_view' }> =>
            a.type === 'upsert_esql_view'
        );
        expect(upsertViewAction).toBeDefined();
        expect(upsertViewAction?.request.name).toBe('$.logs.test');
        expect(upsertViewAction?.request.query).toBe('FROM logs.test');
      });

      it('creates a view referencing child views when the stream has children', async () => {
        const definition = createBaseWiredStreamDefinition({
          name: 'logs.test',
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [], updated_at: new Date().toISOString() },
            settings: {},
            wired: {
              fields: {},
              routing: [
                { destination: 'logs.test.child1', where: { always: {} }, status: 'enabled' },
                { destination: 'logs.test.child2', where: { always: {} }, status: 'enabled' },
              ],
            },
            failure_store: { inherit: {} },
          },
        });

        const deps = createMockDependenciesWithEsClient();
        const stream = new WiredStream(definition, deps);
        const desiredState = createMockState(
          new Map([
            ['logs', { definition: rootLogsDef }],
            ['logs.test', { definition }],
          ])
        );

        const actions = await (stream as unknown as WiredStreamTestable).doDetermineCreateActions(
          desiredState
        );

        const upsertViewAction = actions.find(
          (a): a is Extract<ElasticsearchAction, { type: 'upsert_esql_view' }> =>
            a.type === 'upsert_esql_view'
        );
        expect(upsertViewAction).toBeDefined();
        expect(upsertViewAction?.request.name).toBe('$.logs.test');
        expect(upsertViewAction?.request.query).toBe(
          'FROM logs.test, $.logs.test.child1, $.logs.test.child2'
        );
      });
    });
  });
});
