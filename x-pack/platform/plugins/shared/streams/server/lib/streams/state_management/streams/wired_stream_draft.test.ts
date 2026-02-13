/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { WiredStream } from './wired_stream';
import { State } from '../state';
import type { StateDependencies } from '../types';
import type { LockManagerService } from '@kbn/lock-manager';

const createMockDependencies = (): StateDependencies => ({
  storageClient: {
    search: jest.fn().mockResolvedValue({ hits: { hits: [], total: { value: 0 } } }),
    get: jest.fn(),
    index: jest.fn(),
    delete: jest.fn(),
  } as any,
  scopedClusterClient: {
    asCurrentUser: {
      indices: {
        getDataStream: jest.fn().mockRejectedValue({ statusCode: 404 }),
        get: jest.fn().mockRejectedValue({ statusCode: 404 }),
      },
      ingest: {
        putPipeline: jest.fn(),
        deletePipeline: jest.fn(),
      },
      cluster: {
        putComponentTemplate: jest.fn(),
        deleteComponentTemplate: jest.fn(),
      },
    },
    asInternalUser: {
      indices: {
        getDataStream: jest.fn().mockRejectedValue({ statusCode: 404 }),
      },
    },
  } as any,
  lockManager: {
    withLock: (_: any, cb: () => Promise<any>) => cb(),
  } as LockManagerService,
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any,
  isServerless: false,
  isDev: true,
  streamsClient: {
    getStream: jest.fn(),
  } as any,
  systemClient: {} as any,
  attachmentClient: {} as any,
  queryClient: {} as any,
  featureClient: {} as any,
});

const createWiredStreamDefinition = (
  name: string,
  overrides?: Partial<Streams.WiredStream.Definition>
): Streams.WiredStream.Definition => {
  const now = new Date().toISOString();
  return {
    name,
    description: '',
    updated_at: now,
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [], updated_at: now },
      settings: {},
      wired: {
        fields: {},
        routing: [],
      },
      failure_store: { inherit: {} },
    },
    ...overrides,
  };
};

const createDraftStreamDefinition = (
  name: string,
  overrides?: Partial<Streams.WiredStream.Definition>
): Streams.WiredStream.Definition => {
  return createWiredStreamDefinition(name, {
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [], updated_at: new Date().toISOString() },
      settings: {},
      wired: {
        fields: {},
        routing: [],
        draft: true,
      },
      failure_store: { inherit: {} },
    },
    ...overrides,
  });
};

describe('WiredStream draft mode', () => {
  let mockDependencies: StateDependencies;

  beforeEach(() => {
    mockDependencies = createMockDependencies();
    jest.clearAllMocks();
  });

  describe('isDraft', () => {
    it('returns true for draft streams', () => {
      const definition = createDraftStreamDefinition('logs.draft');
      const stream = new WiredStream(definition, mockDependencies);
      expect(stream.isDraft()).toBe(true);
    });

    it('returns false for non-draft streams', () => {
      const definition = createWiredStreamDefinition('logs.nondraft');
      const stream = new WiredStream(definition, mockDependencies);
      expect(stream.isDraft()).toBe(false);
    });
  });

  describe('isFromDraftToNonDraft', () => {
    it('returns false initially', () => {
      const definition = createWiredStreamDefinition('logs.test');
      const stream = new WiredStream(definition, mockDependencies);
      expect(stream.isFromDraftToNonDraft()).toBe(false);
    });
  });

  describe('doDetermineCreateActions', () => {
    it('only persists definition for draft streams', async () => {
      const definition = createDraftStreamDefinition('logs.draft');
      const stream = new WiredStream(definition, mockDependencies);

      // Mock the state to include the root stream
      const mockState = {
        get: (name: string) => {
          if (name === 'logs') {
            return new WiredStream(createWiredStreamDefinition('logs'), mockDependencies);
          }
          return undefined;
        },
      } as unknown as State;

      const actions = await (stream as any).doDetermineCreateActions(mockState);

      // Draft streams should only have the document upsert action
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('upsert_dot_streams_document');
    });

    it('includes all ES materialization actions for non-draft streams', async () => {
      const definition = createWiredStreamDefinition('logs.nondraft');
      const stream = new WiredStream(definition, mockDependencies);

      // Mock getMatchingDataStream to return no conflicts
      (stream as any).getMatchingDataStream = jest.fn().mockResolvedValue({
        existsAsManagedDataStream: false,
        existsAsIndex: false,
        existsAsDataStream: false,
      });

      // Mock the state to include the root stream
      const rootDefinition = createWiredStreamDefinition('logs');
      rootDefinition.ingest.lifecycle = { dsl: { data_retention: '7d' } };
      rootDefinition.ingest.failure_store = { disabled: {} };

      const mockState = {
        get: (name: string) => {
          if (name === 'logs') {
            return new WiredStream(rootDefinition, mockDependencies);
          }
          if (name === 'logs.nondraft') {
            return stream;
          }
          return undefined;
        },
      } as unknown as State;

      const actions = await (stream as any).doDetermineCreateActions(mockState);

      // Non-draft streams should have all materialization actions
      const actionTypes = actions.map((a: any) => a.type);
      expect(actionTypes).toContain('upsert_component_template');
      expect(actionTypes).toContain('upsert_ingest_pipeline');
      expect(actionTypes).toContain('upsert_index_template');
      expect(actionTypes).toContain('upsert_datastream');
      expect(actionTypes).toContain('update_lifecycle');
      expect(actionTypes).toContain('upsert_dot_streams_document');
    });
  });

  describe('doDetermineUpdateActions', () => {
    it('only persists definition for draft stream updates', async () => {
      const definition = createDraftStreamDefinition('logs.draft');
      const stream = new WiredStream(definition, mockDependencies);

      const mockDesiredState = {} as State;
      const mockStartingState = {} as State;
      const mockStartingStateStream = new WiredStream(
        createDraftStreamDefinition('logs.draft'),
        mockDependencies
      );

      const actions = await (stream as any).doDetermineUpdateActions(
        mockDesiredState,
        mockStartingState,
        mockStartingStateStream
      );

      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('upsert_dot_streams_document');
    });
  });

  describe('doDetermineDeleteActions', () => {
    it('only deletes definition for draft streams', async () => {
      const definition = createDraftStreamDefinition('logs.draft');
      const stream = new WiredStream(definition, mockDependencies);

      const actions = await (stream as any).doDetermineDeleteActions();

      // Draft streams should only delete the document
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('delete_dot_streams_document');
    });

    it('includes all cleanup actions for non-draft streams', async () => {
      const definition = createWiredStreamDefinition('logs.nondraft');
      const stream = new WiredStream(definition, mockDependencies);

      const actions = await (stream as any).doDetermineDeleteActions();

      // Non-draft streams should have all cleanup actions
      const actionTypes = actions.map((a: any) => a.type);
      expect(actionTypes).toContain('delete_index_template');
      expect(actionTypes).toContain('delete_component_template');
      expect(actionTypes).toContain('delete_ingest_pipeline');
      expect(actionTypes).toContain('delete_datastream');
      expect(actionTypes).toContain('delete_dot_streams_document');
    });
  });

  describe('doClone', () => {
    it('preserves the fromDraftToNonDraft flag when cloning', () => {
      const definition = createWiredStreamDefinition('logs.test');
      const stream = new WiredStream(definition, mockDependencies);

      // Manually set the flag (simulating a draft->non-draft transition)
      (stream as any)._fromDraftToNonDraft = true;

      const cloned = (stream as any).doClone();

      expect(cloned.isFromDraftToNonDraft()).toBe(true);
    });
  });
});
