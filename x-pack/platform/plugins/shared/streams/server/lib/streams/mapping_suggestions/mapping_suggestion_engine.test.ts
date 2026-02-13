/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { FieldDefinition, Streams } from '@kbn/streams-schema';
import type { StreamsClient } from '../client';
import { MappingSuggestionEngine } from './mapping_suggestion_engine';

const createMockLogger = (): jest.Mocked<Logger> =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    log: jest.fn(),
    get: jest.fn(),
    isLevelEnabled: jest.fn(),
  } as unknown as jest.Mocked<Logger>);

const createMockScopedClusterClient = (
  searchResponse: Partial<SearchResponse> = {
    hits: { hits: [], total: { value: 0, relation: 'eq' } },
  },
  fieldCapsResponse: Record<string, Record<string, unknown>> = {}
): jest.Mocked<IScopedClusterClient> =>
  ({
    asCurrentUser: {
      search: jest.fn().mockResolvedValue(searchResponse),
      fieldCaps: jest.fn().mockResolvedValue({ fields: fieldCapsResponse }),
    },
    asInternalUser: {},
  } as unknown as jest.Mocked<IScopedClusterClient>);

const createMockFieldsMetadataClient = (
  metadataMap: Record<string, { type?: string; source?: string; description?: string }> = {}
): jest.Mocked<IFieldsMetadataClient> =>
  ({
    find: jest.fn().mockResolvedValue({
      toPlain: () => metadataMap,
    }),
  } as unknown as jest.Mocked<IFieldsMetadataClient>);

const createMockStreamsClient = (
  streamDefinition: Streams.WiredStream.Definition,
  ancestors: Streams.WiredStream.Definition[] = []
): jest.Mocked<StreamsClient> =>
  ({
    getStream: jest.fn().mockResolvedValue(streamDefinition),
    getAncestors: jest.fn().mockResolvedValue(ancestors),
    upsertStream: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<StreamsClient>);

const createWiredStreamDefinition = (
  name: string,
  options: {
    fields?: FieldDefinition;
    draft?: boolean;
  } = {}
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
        fields: options.fields ?? {},
        routing: [],
        ...(options.draft ? { draft: true } : {}),
      },
      failure_store: { inherit: {} },
    },
  };
};

const createSearchHit = (source: Record<string, unknown>): SearchHit => ({
  _index: 'test',
  _id: Math.random().toString(36).slice(2),
  _source: source,
});

const createSearchResponse = (hits: SearchHit[], total?: number): Partial<SearchResponse> => ({
  hits: {
    hits,
    total: { value: total ?? hits.length, relation: 'eq' },
  },
});

describe('MappingSuggestionEngine', () => {
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    jest.clearAllMocks();
  });

  describe('suggestMappings', () => {
    describe('basic functionality', () => {
      it('returns empty result when no documents are found', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test');
        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(),
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient(),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.test');

        expect(result.streamName).toBe('logs.test');
        expect(result.applied).toBe(false);
        expect(result.fields).toHaveLength(0);
        expect(result.stats.totalFields).toBe(0);
        expect(result.stats.mappedCount).toBe(0);
        expect(result.stats.skippedCount).toBe(0);
        expect(result.appliedMappings).toEqual({});
      });

      it('throws error for non-wired streams', async () => {
        const mockStreamsClient = {
          getStream: jest.fn().mockResolvedValue({
            name: 'classic.stream',
            // Non-wired stream (classic)
          }),
          getAncestors: jest.fn().mockResolvedValue([]),
        } as unknown as jest.Mocked<StreamsClient>;

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(),
          streamsClient: mockStreamsClient,
          fieldsMetadataClient: createMockFieldsMetadataClient(),
          logger: mockLogger,
        });

        await expect(engine.suggestMappings('classic.stream')).rejects.toThrow(
          'Stream classic.stream is not a wired stream'
        );
      });
    });

    describe('field occurrence tracking', () => {
      it('tracks field occurrences across multiple documents', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test');
        const hits = [
          createSearchHit({ field_a: 'value1', field_b: 'value2' }),
          createSearchHit({ field_a: 'value3', field_c: 'value4' }),
          createSearchHit({ field_a: 'value5', field_b: 'value6', field_c: 'value7' }),
        ];

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            field_a: { keyword: {} },
            field_b: { keyword: {} },
            field_c: { keyword: {} },
          }),
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient({
            field_a: { type: 'keyword', source: 'ecs' },
            field_b: { type: 'keyword', source: 'ecs' },
            field_c: { type: 'keyword', source: 'ecs' },
          }),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.test');

        // field_a appears in 3/3 docs (100%), field_b in 2/3 (66%), field_c in 2/3 (66%)
        const fieldAResult = result.fields.find((f) => f.name === 'field_a');
        expect(fieldAResult?.occurrenceRate).toBe(1);

        const fieldBResult = result.fields.find((f) => f.name === 'field_b');
        expect(fieldBResult?.occurrenceRate).toBeCloseTo(0.67, 1);

        const fieldCResult = result.fields.find((f) => f.name === 'field_c');
        expect(fieldCResult?.occurrenceRate).toBeCloseTo(0.67, 1);
      });

      it('skips fields with low occurrence rate', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test');
        // 20 documents, rare_field appears in only 1 (5% occurrence)
        const hits = [
          createSearchHit({ common_field: 'v1', rare_field: 'rare' }),
          ...Array(19)
            .fill(null)
            .map(() => createSearchHit({ common_field: 'v' })),
        ];

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            common_field: { keyword: {} },
            rare_field: { keyword: {} },
          }),
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient({
            common_field: { type: 'keyword', source: 'ecs' },
            rare_field: { type: 'keyword', source: 'ecs' },
          }),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.test', { minOccurrenceRate: 0.1 });

        // common_field appears in 20/20 (100%) - should be mapped
        const commonFieldResult = result.fields.find((f) => f.name === 'common_field');
        expect(commonFieldResult?.status).toBe('mapped');

        // rare_field appears in 1/20 (5%) - should be skipped (below 10% threshold)
        const rareFieldResult = result.fields.find((f) => f.name === 'rare_field');
        expect(rareFieldResult?.status).toBe('skipped');
        expect(rareFieldResult?.reason).toBe('low_occurrence_rate');
      });

      it('respects custom minOccurrenceRate', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test');
        // 10 documents, medium_field appears in 3
        const hits = [
          ...Array(3)
            .fill(null)
            .map(() => createSearchHit({ medium_field: 'v' })),
          ...Array(7)
            .fill(null)
            .map(() => createSearchHit({ other: 'v' })),
        ];

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            medium_field: { keyword: {} },
            other: { keyword: {} },
          }),
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient({
            medium_field: { type: 'keyword', source: 'ecs' },
            other: { type: 'keyword', source: 'ecs' },
          }),
          logger: mockLogger,
        });

        // With 50% threshold, medium_field (30%) should be skipped
        const resultHighThreshold = await engine.suggestMappings('logs.test', {
          minOccurrenceRate: 0.5,
        });
        const mediumFieldHighThreshold = resultHighThreshold.fields.find(
          (f) => f.name === 'medium_field'
        );
        expect(mediumFieldHighThreshold?.status).toBe('skipped');
        expect(mediumFieldHighThreshold?.reason).toBe('low_occurrence_rate');

        // With 20% threshold, medium_field (30%) should be mapped
        const resultLowThreshold = await engine.suggestMappings('logs.test', {
          minOccurrenceRate: 0.2,
        });
        const mediumFieldLowThreshold = resultLowThreshold.fields.find(
          (f) => f.name === 'medium_field'
        );
        expect(mediumFieldLowThreshold?.status).toBe('mapped');
      });
    });

    describe('type suggestion sources', () => {
      it('uses ECS metadata for type suggestions', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test');
        const hits = [createSearchHit({ 'host.name': 'server1' })];

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {}),
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient({
            'host.name': { type: 'keyword', source: 'ecs', description: 'Name of the host' },
          }),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.test');

        const hostNameResult = result.fields.find((f) => f.name === 'host.name');
        expect(hostNameResult?.status).toBe('mapped');
        expect(hostNameResult?.type).toBe('keyword');
        expect(hostNameResult?.source).toBe('ecs');
        expect(hostNameResult?.description).toBe('Name of the host');
      });

      it('falls back to ES field caps when metadata is not available', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test');
        const hits = [createSearchHit({ custom_field: 'value' })];

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            custom_field: { keyword: {} },
          }),
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient({}), // No metadata
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.test');

        const customFieldResult = result.fields.find((f) => f.name === 'custom_field');
        expect(customFieldResult?.status).toBe('mapped');
        expect(customFieldResult?.type).toBe('keyword');
        expect(customFieldResult?.source).toBe('es_field_caps');
      });

      it('skips fields with no type available', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test');
        const hits = [createSearchHit({ unknown_field: 'value' })];

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {}),
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient({}), // No metadata
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.test');

        const unknownFieldResult = result.fields.find((f) => f.name === 'unknown_field');
        expect(unknownFieldResult?.status).toBe('skipped');
        expect(unknownFieldResult?.reason).toBe('no_type_available');
      });

      it('skips unsupported ES types', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test');
        // Use a flat field that ES reports as an unsupported type (e.g., 'flattened')
        const hits = [createSearchHit({ unsupported_field: 'value' })];

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(
            createSearchResponse(hits),
            { unsupported_field: { flattened: {} } } // 'flattened' is not a supported mapping type
          ),
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient({}), // No metadata
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.test');

        const unsupportedFieldResult = result.fields.find((f) => f.name === 'unsupported_field');
        expect(unsupportedFieldResult?.status).toBe('skipped');
        expect(unsupportedFieldResult?.reason).toBe('unsupported_type');
      });
    });

    describe('existing mapping handling', () => {
      it('skips fields that already have mappings (existing_mapping_present)', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test', {
          fields: { existing_field: { type: 'keyword' } },
        });
        const hits = [createSearchHit({ existing_field: 'value', new_field: 'value' })];

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            existing_field: { keyword: {} },
            new_field: { keyword: {} },
          }),
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient({
            existing_field: { type: 'keyword', source: 'ecs' },
            new_field: { type: 'keyword', source: 'ecs' },
          }),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.test');

        const existingFieldResult = result.fields.find((f) => f.name === 'existing_field');
        expect(existingFieldResult?.status).toBe('skipped');
        expect(existingFieldResult?.reason).toBe('existing_mapping_present');

        const newFieldResult = result.fields.find((f) => f.name === 'new_field');
        expect(newFieldResult?.status).toBe('mapped');
      });

      it('skips fields with conflicting type suggestions (existing_mapping_conflict)', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test', {
          fields: { type_conflict_field: { type: 'long' } }, // User defined as long
        });
        const hits = [createSearchHit({ type_conflict_field: 'string_value' })];

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            type_conflict_field: { keyword: {} },
          }),
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient({
            type_conflict_field: { type: 'keyword', source: 'ecs' }, // ECS says keyword
          }),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.test');

        const conflictFieldResult = result.fields.find((f) => f.name === 'type_conflict_field');
        expect(conflictFieldResult?.status).toBe('skipped');
        expect(conflictFieldResult?.reason).toBe('existing_mapping_conflict');
      });

      it('skips system fields', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test', {
          fields: { system_field: { type: 'system' } },
        });
        const hits = [createSearchHit({ system_field: 'value', new_field: 'value' })];

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            system_field: { keyword: {} },
            new_field: { keyword: {} },
          }),
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient({
            system_field: { type: 'keyword', source: 'ecs' },
            new_field: { type: 'keyword', source: 'ecs' },
          }),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.test');

        const systemFieldResult = result.fields.find((f) => f.name === 'system_field');
        expect(systemFieldResult?.status).toBe('skipped');
        expect(systemFieldResult?.reason).toBe('system_field');
      });

      it('includes inherited fields from ancestors in existing fields check', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test.child');
        const parentDefinition = createWiredStreamDefinition('logs.test', {
          fields: { inherited_field: { type: 'keyword' } },
        });
        const hits = [createSearchHit({ inherited_field: 'value', new_field: 'value' })];

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            inherited_field: { keyword: {} },
            new_field: { keyword: {} },
          }),
          streamsClient: createMockStreamsClient(streamDefinition, [parentDefinition]),
          fieldsMetadataClient: createMockFieldsMetadataClient({
            inherited_field: { type: 'keyword', source: 'ecs' },
            new_field: { type: 'keyword', source: 'ecs' },
          }),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.test.child');

        // Inherited field should be skipped
        const inheritedFieldResult = result.fields.find((f) => f.name === 'inherited_field');
        expect(inheritedFieldResult?.status).toBe('skipped');
        expect(inheritedFieldResult?.reason).toBe('existing_mapping_present');

        // New field should be mapped
        const newFieldResult = result.fields.find((f) => f.name === 'new_field');
        expect(newFieldResult?.status).toBe('mapped');
      });
    });

    describe('draft stream handling', () => {
      it('samples from parent stream for draft streams', async () => {
        const draftStreamDefinition = createWiredStreamDefinition('logs.draft', { draft: true });
        const parentDefinition = createWiredStreamDefinition('logs');

        const mockScopedClusterClient = createMockScopedClusterClient(
          createSearchResponse([createSearchHit({ field_a: 'value' })]),
          { field_a: { keyword: {} } }
        );

        const mockStreamsClient = createMockStreamsClient(draftStreamDefinition, [
          parentDefinition,
        ]);

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: mockScopedClusterClient,
          streamsClient: mockStreamsClient,
          fieldsMetadataClient: createMockFieldsMetadataClient({
            field_a: { type: 'keyword', source: 'ecs' },
          }),
          logger: mockLogger,
        });

        await engine.suggestMappings('logs.draft');

        // Should query the parent stream 'logs' not 'logs.draft'
        expect(mockScopedClusterClient.asCurrentUser.search).toHaveBeenCalledWith(
          expect.objectContaining({ index: 'logs' })
        );
      });

      it('throws error for draft stream without parent', async () => {
        // Root stream marked as draft (invalid)
        const invalidDraftDefinition: Streams.WiredStream.Definition = {
          name: 'logs',
          description: '',
          updated_at: new Date().toISOString(),
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
        };

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(),
          streamsClient: createMockStreamsClient(invalidDraftDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient(),
          logger: mockLogger,
        });

        await expect(engine.suggestMappings('logs')).rejects.toThrow(
          'Draft stream logs must have a parent stream'
        );
      });
    });

    describe('auto-apply behavior', () => {
      it('applies mappings when autoApply is true and stream is draft', async () => {
        const draftStreamDefinition = createWiredStreamDefinition('logs.draft', { draft: true });
        const parentDefinition = createWiredStreamDefinition('logs');
        const hits = [createSearchHit({ new_field: 'value' })];

        const mockStreamsClient = createMockStreamsClient(draftStreamDefinition, [
          parentDefinition,
        ]);

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            new_field: { keyword: {} },
          }),
          streamsClient: mockStreamsClient,
          fieldsMetadataClient: createMockFieldsMetadataClient({
            new_field: { type: 'keyword', source: 'ecs' },
          }),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.draft', { autoApply: true });

        expect(result.applied).toBe(true);
        expect(mockStreamsClient.upsertStream).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'logs.draft',
            request: expect.objectContaining({
              stream: expect.objectContaining({
                ingest: expect.objectContaining({
                  wired: expect.objectContaining({
                    fields: { new_field: { type: 'keyword' } },
                  }),
                }),
              }),
            }),
          })
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Applied 1 field mappings')
        );
      });

      it('does not apply mappings when autoApply is false', async () => {
        const draftStreamDefinition = createWiredStreamDefinition('logs.draft', { draft: true });
        const parentDefinition = createWiredStreamDefinition('logs');
        const hits = [createSearchHit({ new_field: 'value' })];

        const mockStreamsClient = createMockStreamsClient(draftStreamDefinition, [
          parentDefinition,
        ]);

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            new_field: { keyword: {} },
          }),
          streamsClient: mockStreamsClient,
          fieldsMetadataClient: createMockFieldsMetadataClient({
            new_field: { type: 'keyword', source: 'ecs' },
          }),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.draft', { autoApply: false });

        expect(result.applied).toBe(false);
        expect(mockStreamsClient.upsertStream).not.toHaveBeenCalled();
      });

      it('does not apply mappings for non-draft streams even with autoApply true', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.materialized');
        const hits = [createSearchHit({ new_field: 'value' })];

        const mockStreamsClient = createMockStreamsClient(streamDefinition);

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            new_field: { keyword: {} },
          }),
          streamsClient: mockStreamsClient,
          fieldsMetadataClient: createMockFieldsMetadataClient({
            new_field: { type: 'keyword', source: 'ecs' },
          }),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.materialized', { autoApply: true });

        expect(result.applied).toBe(false);
        expect(mockStreamsClient.upsertStream).not.toHaveBeenCalled();
      });

      it('does not apply when there are no mappings to apply', async () => {
        const draftStreamDefinition = createWiredStreamDefinition('logs.draft', { draft: true });
        const parentDefinition = createWiredStreamDefinition('logs');

        const mockStreamsClient = createMockStreamsClient(draftStreamDefinition, [
          parentDefinition,
        ]);

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse([])),
          streamsClient: mockStreamsClient,
          fieldsMetadataClient: createMockFieldsMetadataClient(),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.draft', { autoApply: true });

        expect(result.applied).toBe(false);
        expect(mockStreamsClient.upsertStream).not.toHaveBeenCalled();
      });

      it('preserves existing stream fields when applying', async () => {
        const draftStreamDefinition = createWiredStreamDefinition('logs.draft', {
          draft: true,
          fields: { existing_field: { type: 'long' } },
        });
        const parentDefinition = createWiredStreamDefinition('logs');
        const hits = [createSearchHit({ existing_field: '123', new_field: 'value' })];

        const mockStreamsClient = createMockStreamsClient(draftStreamDefinition, [
          parentDefinition,
        ]);

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            existing_field: { long: {} },
            new_field: { keyword: {} },
          }),
          streamsClient: mockStreamsClient,
          fieldsMetadataClient: createMockFieldsMetadataClient({
            existing_field: { type: 'long', source: 'ecs' },
            new_field: { type: 'keyword', source: 'ecs' },
          }),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.draft', { autoApply: true });

        expect(result.applied).toBe(true);
        // Verify existing field is preserved and new field is added
        expect(mockStreamsClient.upsertStream).toHaveBeenCalledWith(
          expect.objectContaining({
            request: expect.objectContaining({
              stream: expect.objectContaining({
                ingest: expect.objectContaining({
                  wired: expect.objectContaining({
                    fields: {
                      existing_field: { type: 'long' }, // Preserved
                      new_field: { type: 'keyword' }, // Added
                    },
                  }),
                }),
              }),
            }),
          })
        );
      });

      it('reports error when apply fails', async () => {
        const draftStreamDefinition = createWiredStreamDefinition('logs.draft', { draft: true });
        const parentDefinition = createWiredStreamDefinition('logs');
        const hits = [createSearchHit({ new_field: 'value' })];

        const mockStreamsClient = createMockStreamsClient(draftStreamDefinition, [
          parentDefinition,
        ]);
        mockStreamsClient.upsertStream.mockRejectedValue(new Error('ES connection failed'));

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            new_field: { keyword: {} },
          }),
          streamsClient: mockStreamsClient,
          fieldsMetadataClient: createMockFieldsMetadataClient({
            new_field: { type: 'keyword', source: 'ecs' },
          }),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.draft', { autoApply: true });

        expect(result.applied).toBe(false);
        expect(result.error).toBe('ES connection failed');
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to apply mappings')
        );
      });
    });

    describe('statistics calculation', () => {
      it('calculates correct statistics', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test', {
          fields: { existing: { type: 'keyword' } },
        });
        // 10 docs: 5 with common fields, some with rare
        const hits = [
          ...Array(5)
            .fill(null)
            .map(() => createSearchHit({ existing: 'v', mapped_field: 'v', another_mapped: 'v' })),
          ...Array(5)
            .fill(null)
            .map(() => createSearchHit({ existing: 'v', mapped_field: 'v' })),
        ];

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            existing: { keyword: {} },
            mapped_field: { keyword: {} },
            another_mapped: { keyword: {} },
          }),
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient({
            existing: { type: 'keyword', source: 'ecs' },
            mapped_field: { type: 'keyword', source: 'ecs' },
            another_mapped: { type: 'keyword', source: 'ecs' },
          }),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.test');

        expect(result.stats.totalFields).toBe(3);
        // existing is skipped (existing_mapping_present), mapped_field and another_mapped should be mapped
        // another_mapped appears in 50% of docs (5/10) which is above 10% threshold
        expect(result.stats.mappedCount).toBe(2);
        expect(result.stats.skippedCount).toBe(1);
        expect(result.stats.errorCount).toBe(0);
      });
    });

    describe('result serialization', () => {
      it('produces a valid serializable result', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test');
        const hits = [createSearchHit({ field_a: 'value' })];

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            field_a: { keyword: {} },
          }),
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient({
            field_a: { type: 'keyword', source: 'ecs', description: 'Test field' },
          }),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.test');

        // Verify the result can be serialized and deserialized
        const serialized = JSON.stringify(result);
        const deserialized = JSON.parse(serialized);

        expect(deserialized.streamName).toBe('logs.test');
        expect(deserialized.applied).toBe(false);
        expect(deserialized.fields).toHaveLength(1);
        expect(deserialized.fields[0]).toEqual({
          name: 'field_a',
          status: 'mapped',
          type: 'keyword',
          source: 'ecs',
          description: 'Test field',
          occurrenceRate: 1,
        });
        expect(deserialized.stats).toEqual({
          totalFields: 1,
          mappedCount: 1,
          skippedCount: 0,
          errorCount: 0,
        });
        expect(deserialized.appliedMappings).toEqual({
          field_a: { type: 'keyword' },
        });
        expect(deserialized.timestamp).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('handles 404 index not found gracefully', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test');
        const mockScopedClusterClient = createMockScopedClusterClient();
        (mockScopedClusterClient.asCurrentUser.search as jest.Mock).mockRejectedValue({
          statusCode: 404,
        });

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: mockScopedClusterClient,
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient(),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.test');

        expect(result.fields).toHaveLength(0);
        expect(result.stats.totalFields).toBe(0);
      });

      it('handles field metadata service failure gracefully', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test');
        const hits = [createSearchHit({ field_a: 'value' })];

        const mockFieldsMetadataClient = createMockFieldsMetadataClient();
        (mockFieldsMetadataClient.find as jest.Mock).mockRejectedValue(
          new Error('Service unavailable')
        );

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            field_a: { keyword: {} },
          }),
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: mockFieldsMetadataClient,
          logger: mockLogger,
        });

        // Should not throw, should fall back to ES field caps
        const result = await engine.suggestMappings('logs.test');

        const fieldAResult = result.fields.find((f) => f.name === 'field_a');
        expect(fieldAResult?.status).toBe('mapped');
        expect(fieldAResult?.source).toBe('es_field_caps');
      });

      it('handles field caps failure gracefully', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test');
        const hits = [createSearchHit({ field_a: 'value' })];

        const mockScopedClusterClient = createMockScopedClusterClient(createSearchResponse(hits));
        (mockScopedClusterClient.asCurrentUser.fieldCaps as jest.Mock).mockRejectedValue(
          new Error('Field caps failed')
        );

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: mockScopedClusterClient,
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient({
            field_a: { type: 'keyword', source: 'ecs' },
          }),
          logger: mockLogger,
        });

        // Should not throw, should use metadata
        const result = await engine.suggestMappings('logs.test');

        const fieldAResult = result.fields.find((f) => f.name === 'field_a');
        expect(fieldAResult?.status).toBe('mapped');
        expect(fieldAResult?.source).toBe('ecs');
      });
    });

    describe('nested field handling', () => {
      it('handles dot-notation nested fields', async () => {
        const streamDefinition = createWiredStreamDefinition('logs.test');
        const hits = [
          createSearchHit({ 'http.response.status_code': 200, 'http.request.method': 'GET' }),
        ];

        const engine = new MappingSuggestionEngine({
          scopedClusterClient: createMockScopedClusterClient(createSearchResponse(hits), {
            'http.response.status_code': { long: {} },
            'http.request.method': { keyword: {} },
          }),
          streamsClient: createMockStreamsClient(streamDefinition),
          fieldsMetadataClient: createMockFieldsMetadataClient({
            'http.response.status_code': { type: 'long', source: 'ecs' },
            'http.request.method': { type: 'keyword', source: 'ecs' },
          }),
          logger: mockLogger,
        });

        const result = await engine.suggestMappings('logs.test');

        expect(result.fields).toHaveLength(2);
        expect(result.appliedMappings['http.response.status_code']).toEqual({ type: 'long' });
        expect(result.appliedMappings['http.request.method']).toEqual({ type: 'keyword' });
      });
    });
  });
});
