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

function createCompleteWiredStreamDefinition(overrides: any = {}) {
  return {
    name: 'test-stream',
    description: 'Test stream',
    ingest: {
      lifecycle: { dsl: {} },
      processing: { steps: [] },
      settings: {},
      wired: {
        fields: {},
        routing: [],
        ...overrides,
      },
    },
  };
}

function getRoutingFromResult(result: any) {
  return (result as any).ingest?.wired?.routing;
}

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
          routing: [createRoutingRule({ where: { type: 'never', never: {} } })],
        });

        const result = migrateOnRead(definition);
        const routing = getRoutingFromResult(result);

        expect(routing).toHaveLength(1);
        expect(routing[0].status).toBe('disabled');
        expect(routing[0].where).toEqual({ type: 'always', always: {} });
        expect(mockIsNeverCondition).toHaveBeenCalledWith({ type: 'never', never: {} });
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
            createRoutingRule({ destination: 'test.stream.2', where: { type: 'never', never: {} } }),
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
        expect(routing[1].where).toEqual({ type: 'always', always: {} });
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
      const definition = {
        name: 'test-stream',
        description: 'Test stream',
        ingest: {
          lifecycle: { dsl: {} },
          settings: {},
          processing: { steps: [] },
          classic: { someConfig: 'value' },
        },
      };

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
        },
      };

      const result = migrateOnRead(definition);
      expect(result.description).toBe('');
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
        },
      };

      const result = migrateOnRead(definition);
      expect((result as any).ingest.settings).toEqual({});
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
        },
      };

      const result = migrateOnRead(definition);
      expect((result as any).ingest.classic).toEqual({ someConfig: 'value' });
      expect((result as any).ingest.unwired).toBeUndefined();
      expect(mockStreamsAsserts).toHaveBeenCalled();
    });
  });

  describe('group migration', () => {
    it('should add metadata to group if missing', () => {
      const definition = {
        name: 'test-group-stream',
        description: 'Test group stream',
        group: {
          members: ['stream1', 'stream2'],
          tags: ['tag1', 'tag2'],
          // No metadata field
        },
      };

      const result = migrateOnRead(definition);

      expect((result as any).group.metadata).toEqual({});
      expect(mockStreamsAsserts).toHaveBeenCalled();
    });

    it('should add tags to group if missing', () => {
      const definition = {
        name: 'test-group-stream',
        description: 'Test group stream',
        group: {
          members: ['stream1', 'stream2'],
          metadata: { foo: 'bar' },
          // No tags field
        },
      };

      const result = migrateOnRead(definition);

      expect((result as any).group.tags).toEqual([]);
      expect(mockStreamsAsserts).toHaveBeenCalled();
    });
  });
});
