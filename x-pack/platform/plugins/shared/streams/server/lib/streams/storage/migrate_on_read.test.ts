/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { migrateOnRead } from './migrate_on_read';
import { isNeverCondition } from '@kbn/streamlang';
import { Streams } from '@kbn/streams-schema';

jest.mock('@kbn/streamlang', () => ({
  isNeverCondition: jest.fn(),
}));

jest.mock('./migrate_to_streamlang_on_read', () => ({
  migrateRoutingIfConditionToStreamlang: jest.fn((definition) => definition),
  migrateOldProcessingArrayToStreamlang: jest.fn((definition) => definition),
  migrateWhereBlocksToCondition: jest.fn((steps) => ({ steps, migrated: false })),
}));

jest.mock('@kbn/streams-schema', () => ({
  Streams: {
    all: {
      Definition: {
        asserts: jest.fn(),
      },
    },
  },
}));

const mockIsNeverCondition = isNeverCondition as jest.MockedFunction<typeof isNeverCondition>;
const mockStreamsAsserts = Streams.all.Definition.asserts as jest.MockedFunction<
  typeof Streams.all.Definition.asserts
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createCompleteWiredStreamDefinition(overrides: any = {}) {
  return {
    name: 'test-stream',
    description: 'Test stream',
    updated_at: new Date().toISOString(),
    query_streams: [],
    ingest: {
      lifecycle: { dsl: {} },
      processing: { steps: [], updated_at: new Date().toISOString() },
      settings: {},
      wired: {
        fields: {},
        routing: [],
        ...overrides,
      },
      failure_store: { inherit: {} },
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createCompleteClassicStreamDefinition(overrides: any = {}) {
  return {
    name: 'test-classic-stream',
    description: 'Test classic stream',
    updated_at: new Date().toISOString(),
    query_streams: [],
    ingest: {
      lifecycle: { dsl: {} },
      processing: { steps: [], updated_at: new Date().toISOString() },
      settings: {},
      classic: {
        fieldOverrides: [],
        ...overrides,
      },
      failure_store: { inherit: {} },
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRoutingFromResult(result: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (result as any).ingest?.wired?.routing;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createRoutingRule(overrides: any = {}) {
  return {
    destination: 'test.childstream',
    where: { field: 'service.name', eq: 'test' },
    ...overrides,
  };
}

describe('migrateOnRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNeverCondition.mockReturnValue(false);
    mockStreamsAsserts.mockImplementation(() => {});
  });

  describe('routing status migration', () => {
    describe('when routing rules need status migration', () => {
      it('should add enabled status to rules without status', () => {
        const definition = createCompleteWiredStreamDefinition({
          routing: [createRoutingRule()],
        });

        const result = migrateOnRead(definition);
        const routing = getRoutingFromResult(result);

        expect(routing).toHaveLength(1);
        expect(routing[0].status).toBe('enabled');
        expect(mockStreamsAsserts).toHaveBeenCalled();
      });

      it('should migrate never conditions to disabled status', () => {
        mockIsNeverCondition.mockReturnValue(true);

        const definition = createCompleteWiredStreamDefinition({
          routing: [createRoutingRule({ where: { never: {} } })],
        });

        const result = migrateOnRead(definition);
        const routing = getRoutingFromResult(result);

        expect(routing).toHaveLength(1);
        expect(routing[0].status).toBe('disabled');
        expect(routing[0].where).toEqual({ always: {} });
        expect(mockIsNeverCondition).toHaveBeenCalledWith({ never: {} });
        expect(mockStreamsAsserts).toHaveBeenCalled();
      });

      it('should migrate multiple routing rules with mixed status', () => {
        mockIsNeverCondition
          .mockReturnValueOnce(false) // First rule
          .mockReturnValueOnce(true) // Second rule
          .mockReturnValueOnce(false); // Third rule

        const definition = createCompleteWiredStreamDefinition({
          routing: [
            createRoutingRule({
              destination: 'test.stream.1',
              where: { field: 'service.name', eq: 'test1' },
            }),
            createRoutingRule({ destination: 'test.stream.2', where: { never: {} } }),
            createRoutingRule({
              destination: 'test.stream.3',
              where: { field: 'service.name', eq: 'test3' },
              status: 'enabled',
            }),
          ],
        });

        const result = migrateOnRead(definition);
        const routing = getRoutingFromResult(result);

        expect(routing).toHaveLength(3);
        expect(routing[0].status).toBe('enabled');
        expect(routing[0].where).toEqual({ field: 'service.name', eq: 'test1' });
        expect(routing[1].status).toBe('disabled');
        expect(routing[1].where).toEqual({ always: {} });
        expect(routing[2].status).toBe('enabled');
        expect(routing[2].where).toEqual({ field: 'service.name', eq: 'test3' });
        expect(mockStreamsAsserts).toHaveBeenCalled();
      });
    });

    describe('when routing rules already have status', () => {
      it('should preserve existing status field', () => {
        const definition = createCompleteWiredStreamDefinition({
          routing: [createRoutingRule({ status: 'disabled' })],
        });

        const result = migrateOnRead(definition);
        const routing = getRoutingFromResult(result);

        expect(routing).toHaveLength(1);
        expect(routing[0].status).toBe('disabled');
        expect(mockStreamsAsserts).not.toHaveBeenCalled();
      });
    });

    it('should handle empty routing array', () => {
      const definition = createCompleteWiredStreamDefinition({ routing: [] });

      const result = migrateOnRead(definition);
      const routing = getRoutingFromResult(result);

      expect(routing).toEqual([]);
      expect(mockStreamsAsserts).not.toHaveBeenCalled();
    });

    it('should handle definition without routing', () => {
      const definition = createCompleteWiredStreamDefinition();

      const result = migrateOnRead(definition);
      expect(result).toEqual(definition);
      expect(mockStreamsAsserts).not.toHaveBeenCalled();
    });

    it('should handle definition without wired ingest', () => {
      const definition = createCompleteClassicStreamDefinition({ someConfig: 'value' });

      const result = migrateOnRead(definition);
      expect(result).toEqual(definition);
      expect(mockStreamsAsserts).not.toHaveBeenCalled();
    });
  });

  describe('description migration', () => {
    it('should add description if missing', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          lifecycle: { dsl: {} },
          processing: { steps: [] },
          wired: {
            fields: {},
            routing: [createRoutingRule()],
          },
          failure_store: { inherit: {} },
        },
      };

      const result = migrateOnRead(definition);
      expect(result.description).toBe('');
      expect(mockStreamsAsserts).toHaveBeenCalled();
    });
  });

  describe('query_streams migration', () => {
    it('should add query_streams if missing', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          lifecycle: { dsl: {} },
          processing: { steps: [] },
          wired: {
            fields: {},
            routing: [createRoutingRule()],
          },
          failure_store: { inherit: {} },
        },
      };

      const result = migrateOnRead(definition);
      expect(result.query_streams).toEqual([]);
      expect(mockStreamsAsserts).toHaveBeenCalled();
    });
  });

  describe('wired ingest migration', () => {
    it('should add settings to ingest if missing', () => {
      const definition = {
        name: 'test-stream',
        ingest: {
          lifecycle: { dsl: {} },
          processing: { steps: [] },
          wired: {
            fields: {},
            routing: [createRoutingRule()],
          },
          failure_store: { inherit: {} },
        },
      };

      const result = migrateOnRead(definition);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).ingest.settings).toEqual({});
      expect(mockStreamsAsserts).toHaveBeenCalled();
    });

    it('should add failure_store inherit if missing for non root stream', () => {
      const definition = {
        name: 'test-stream.child',
        description: 'Test stream',
        ingest: {
          lifecycle: { dsl: {} },
          processing: { steps: [] },
          settings: {},
          wired: {
            fields: {},
            routing: [],
          },
        },
      };

      const result = migrateOnRead(definition);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).ingest.failure_store).toEqual({ inherit: {} });
      expect(mockStreamsAsserts).toHaveBeenCalled();
    });

    it('should add failure_store lifecycle if missing for root stream', () => {
      const definition = {
        name: 'test-stream',
        description: 'Test stream',
        ingest: {
          lifecycle: { dsl: {} },
          processing: { steps: [] },
          settings: {},
          wired: {
            fields: {},
            routing: [],
          },
        },
      };

      const result = migrateOnRead(definition);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).ingest.failure_store).toEqual({
        lifecycle: { enabled: { data_retention: '30d' } },
      });
      expect(mockStreamsAsserts).toHaveBeenCalled();
    });
  });

  describe('unwired migration', () => {
    it('should rename unwired to classic', () => {
      const definition = {
        name: 'test-stream',
        description: 'Test stream',
        ingest: {
          lifecycle: { dsl: {} },
          processing: { steps: [] },
          unwired: { someConfig: 'value' },
          failure_store: { inherit: {} },
        },
      };

      const result = migrateOnRead(definition);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).ingest.classic).toEqual({ someConfig: 'value' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result as any).ingest.unwired).toBeUndefined();
      expect(mockStreamsAsserts).toHaveBeenCalled();
    });
  });

  describe('updated_at migration', () => {
    describe('Should add updated_at if missing', () => {
      it('for wired stream', () => {
        const definition = createCompleteWiredStreamDefinition() as Partial<
          ReturnType<typeof createCompleteWiredStreamDefinition>
        >;
        delete definition.updated_at;

        const result = migrateOnRead(definition);
        expect(result.updated_at).toEqual(new Date(0).toISOString());
        expect(mockStreamsAsserts).toHaveBeenCalled();
      });

      it('for classic stream', () => {
        const definition = createCompleteClassicStreamDefinition() as Partial<
          ReturnType<typeof createCompleteClassicStreamDefinition>
        >;
        delete definition.updated_at;

        const result = migrateOnRead(definition);
        expect(result.updated_at).toEqual(new Date(0).toISOString());
        expect(mockStreamsAsserts).toHaveBeenCalled();
      });
    });

    describe('Should not touch updated_at if present', () => {
      it('for wired stream', () => {
        const definition = createCompleteWiredStreamDefinition();
        const existingUpdatedAt = definition.updated_at;

        const result = migrateOnRead(definition);
        expect(result.updated_at).toEqual(existingUpdatedAt);
        expect(mockStreamsAsserts).not.toHaveBeenCalled();
      });

      it('for classic stream', () => {
        const definition = createCompleteClassicStreamDefinition();
        const existingUpdatedAt = definition.updated_at;

        const result = migrateOnRead(definition);
        expect(result.updated_at).toEqual(existingUpdatedAt);
        expect(mockStreamsAsserts).not.toHaveBeenCalled();
      });
    });
  });

  describe('ingest.processing.updated_at migration', () => {
    describe('Should add updated_at if missing', () => {
      it('for wired stream', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const definition = createCompleteWiredStreamDefinition() as any;
        delete definition.ingest?.processing?.updated_at;

        const result = migrateOnRead(definition) as Streams.WiredStream.Definition;
        expect(result.ingest.processing.updated_at).toEqual(new Date(0).toISOString());
        expect(mockStreamsAsserts).toHaveBeenCalled();
      });

      it('for classic stream', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const definition = createCompleteClassicStreamDefinition() as any;
        delete definition.ingest?.processing?.updated_at;

        const result = migrateOnRead(definition) as Streams.ClassicStream.Definition;
        expect(result.ingest.processing.updated_at).toEqual(new Date(0).toISOString());
        expect(mockStreamsAsserts).toHaveBeenCalled();
      });
    });

    describe('Should not touch updated_at if present', () => {
      it('for wired stream', () => {
        const definition = createCompleteWiredStreamDefinition();
        const existingUpdatedAt = definition.ingest.processing.updated_at;

        const result = migrateOnRead(definition) as Streams.WiredStream.Definition;
        expect(result.ingest.processing.updated_at).toEqual(existingUpdatedAt);
        expect(mockStreamsAsserts).not.toHaveBeenCalled();
      });

      it('for classic stream', () => {
        const definition = createCompleteClassicStreamDefinition();
        const existingUpdatedAt = definition.ingest.processing.updated_at;

        const result = migrateOnRead(definition) as Streams.ClassicStream.Definition;
        expect(result.ingest.processing.updated_at).toEqual(existingUpdatedAt);
        expect(mockStreamsAsserts).not.toHaveBeenCalled();
      });
    });

    it('Should not fail if applied to old Group stream definitions', () => {
      const groupStreamDefinition = {
        name: 'Old Group stream',
        description: 'An old Group stream',
        updated_at: '2026-01-07T10:36:31.522Z',
        group: { metadata: {}, tags: [], members: [] },
      };

      expect(() => migrateOnRead(groupStreamDefinition)).not.toThrow();
    });
  });
});
