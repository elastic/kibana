/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsMapping } from './actions_mapping';
import { actionResponsesMapping } from './action_responses_mapping';
import {
  isSubsetMapping,
  createIndexIfNotExists,
  initializeTransformsIndices,
  ACTIONS_INDEX_NAME,
  ACTIONS_INDEX_DEFAULT_NS,
  ACTION_RESPONSES_INDEX_NAME,
  ACTION_RESPONSES_INDEX_DEFAULT_NS,
} from './create_transforms_indices';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

interface IndexTemplateResponse {
  index_templates: Array<{
    name: string;
    index_template: {
      template: {
        mappings: Record<string, unknown>;
      };
    };
  }>;
}

interface MockEsClient {
  indices: {
    exists: jest.Mock<Promise<boolean>>;
    putIndexTemplate: jest.Mock<Promise<{ acknowledged: boolean }>>;
    create: jest.Mock<Promise<{ acknowledged: boolean }>>;
    getIndexTemplate: jest.Mock<Promise<IndexTemplateResponse>>;
    putMapping: jest.Mock<Promise<{ acknowledged: boolean }>>;
  };
}

interface EsIndexMappings {
  properties: Record<string, unknown>;
}

const createMockEsClient = (): MockEsClient => ({
  indices: {
    exists: jest.fn().mockResolvedValue(false),
    putIndexTemplate: jest.fn().mockResolvedValue({ acknowledged: true }),
    create: jest.fn().mockResolvedValue({ acknowledged: true }),
    getIndexTemplate: jest.fn().mockResolvedValue({
      index_templates: [
        {
          name: 'test',
          index_template: {
            template: {
              mappings: {},
            },
          },
        },
      ],
    }),
    putMapping: jest.fn().mockResolvedValue({ acknowledged: true }),
  },
});

const logger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  get: jest.fn(() => logger),
} as Partial<Logger> as Logger;

let mockEsClient: ReturnType<typeof createMockEsClient>;

function makeEsIndexMappings(
  overrides: Partial<EsIndexMappings['properties']> = {}
): EsIndexMappings {
  return {
    properties: {
      pack_name: { ignore_above: 1024, type: 'keyword' },
      metadata: { type: 'object', enabled: false },
      data: {
        properties: {
          query: { ignore_above: 1024, type: 'keyword' },
        },
      },
      pack_id: { ignore_above: 1024, type: 'keyword' },
      space_id: { type: 'keyword' },
      input_type: { ignore_above: 1024, type: 'keyword' },
      pack_prebuilt: { type: 'boolean' },
      type: { ignore_above: 1024, type: 'keyword' },
      queries: {
        properties: {
          action_id: { ignore_above: 1024, type: 'keyword' },
          saved_query_id: { ignore_above: 1024, type: 'keyword' },
          saved_query_prebuilt: { type: 'boolean' },
          query: { type: 'text' },
          id: { ignore_above: 1024, type: 'keyword' },
          version: { ignore_above: 1024, type: 'keyword' },
          ecs_mapping: { type: 'object', enabled: false },
          platform: { ignore_above: 1024, type: 'keyword' },
          agents: { ignore_above: 1024, type: 'keyword' },
          ...((overrides.queries as any)?.properties || {}),
        },
        ...((overrides.queries as any) || {}),
      },
      agents: { ignore_above: 1024, type: 'keyword' },
      '@timestamp': { type: 'date' },
      action_id: { ignore_above: 1024, type: 'keyword' },
      user_id: { ignore_above: 1024, type: 'keyword' },
      expiration: { type: 'date' },
      event: {
        properties: {
          agent_id_status: { ignore_above: 1024, type: 'keyword' },
          ingested: {
            format: 'strict_date_time_no_millis||strict_date_optional_time||epoch_millis',
            type: 'date',
          },
          ...((overrides.event as any)?.properties || {}),
        },
        ...((overrides.event as any) || {}),
      },
      agent_ids: { ignore_above: 1024, type: 'keyword' },
      ...overrides,
    },
  };
}

describe('createTransformIndices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('isSubsetMapping', () => {
    it('returns true for exact match', () => {
      const mapping = { foo: { type: 'keyword' } };
      expect(isSubsetMapping(mapping, mapping, logger)).toBe(true);
    });

    it('returns true if current has extra fields', () => {
      const desired = { foo: { type: 'keyword' } };
      const current = { foo: { type: 'keyword' }, bar: { type: 'text' } };
      expect(isSubsetMapping(desired, current, logger)).toBe(true);
    });

    it('returns false if current is missing a field', () => {
      const desired = { foo: { type: 'keyword' }, bar: { type: 'text' } };
      const current = { foo: { type: 'keyword' } };
      expect(isSubsetMapping(desired, current, logger)).toBe(false);
    });

    it('returns false if a field has a different value', () => {
      const desired = { foo: { type: 'keyword' } };
      const current = { foo: { type: 'text' } };
      expect(isSubsetMapping(desired, current, logger)).toBe(false);
    });

    it('handles nested properties correctly', () => {
      const desired = {
        properties: {
          foo: { type: 'keyword' },
        },
      };
      const current = {
        properties: {
          foo: { type: 'keyword' },
          bar: { type: 'text' },
        },
        extra: 'ignored',
      };
      expect(isSubsetMapping(desired, current, logger)).toBe(true);
    });

    it('returns false for missing nested property', () => {
      const desired = {
        properties: {
          foo: { type: 'keyword' },
          bar: { type: 'text' },
        },
      };
      const current = {
        properties: {
          foo: { type: 'keyword' },
        },
      };
      expect(isSubsetMapping(desired, current, logger)).toBe(false);
    });

    it('returns true for leaf value match', () => {
      expect(isSubsetMapping({ foo: 'a' }, { foo: 'a' }, logger)).toBe(true);
    });

    it('returns false for leaf value mismatch', () => {
      expect(isSubsetMapping({ foo: 'a' }, { foo: 'b' }, logger)).toBe(false);
    });

    describe('Using mocked data', () => {
      it('returns true for real-world mapping vs index mappings', () => {
        const esIndexMappings = makeEsIndexMappings();
        expect(
          isSubsetMapping(
            actionsMapping as Record<string, unknown>,
            esIndexMappings as unknown as Record<string, unknown>,
            logger
          )
        ).toBe(true);
      });

      it('returns false if a required field is missing in ES mapping', () => {
        const esIndexMappings = makeEsIndexMappings();
        delete esIndexMappings.properties.space_id;
        expect(
          isSubsetMapping(
            actionsMapping as Record<string, unknown>,
            esIndexMappings as unknown as Record<string, unknown>,
            logger
          )
        ).toBe(false);
      });

      it('returns false if a field type mismatches', () => {
        const esIndexMappings = makeEsIndexMappings({
          action_id: { type: 'text' }, // should be 'keyword'
        });
        expect(
          isSubsetMapping(
            actionsMapping as Record<string, unknown>,
            esIndexMappings as unknown as Record<string, unknown>,
            logger
          )
        ).toBe(false);
      });

      it('returns true if ES mapping has extra fields', () => {
        const esIndexMappings = makeEsIndexMappings({ extra_field: { type: 'keyword' } });
        expect(
          isSubsetMapping(
            actionsMapping as Record<string, unknown>,
            esIndexMappings as unknown as Record<string, unknown>,
            logger
          )
        ).toBe(true);
      });

      it('returns false if a nested property is missing', () => {
        const esIndexMappings = makeEsIndexMappings();
        delete (esIndexMappings.properties.queries as { properties: Record<string, unknown> })
          .properties.action_id;

        expect(
          isSubsetMapping(
            actionsMapping as Record<string, unknown>,
            esIndexMappings as unknown as Record<string, unknown>,
            logger
          )
        ).toBe(false);
      });

      it('returns false if a nested property type mismatches', () => {
        const esIndexMappings = makeEsIndexMappings({
          queries: {
            properties: {
              ...(makeEsIndexMappings().properties.queries as any).properties,
              action_id: { type: 'text' }, // should be 'keyword'
            },
          },
        });
        expect(
          isSubsetMapping(
            actionsMapping as Record<string, unknown>,
            esIndexMappings as unknown as Record<string, unknown>,
            logger
          )
        ).toBe(false);
      });
    });
  });

  describe('createIndexIfNotExists', () => {
    beforeEach(() => {
      mockEsClient = createMockEsClient();
      jest.clearAllMocks();
    });

    it('should create index and template if they do not exist', async () => {
      mockEsClient.indices.exists.mockResolvedValueOnce(false);
      mockEsClient.indices.putIndexTemplate.mockResolvedValueOnce({ acknowledged: true } as any);
      mockEsClient.indices.create.mockResolvedValueOnce({ acknowledged: true } as any);

      await createIndexIfNotExists(
        mockEsClient as unknown as ElasticsearchClient,
        'test-index',
        '.logs-test-index-default',
        actionsMapping,
        logger
      );

      expect(mockEsClient.indices.exists).toHaveBeenCalledWith({
        index: '.logs-test-index-default',
      });
      expect(mockEsClient.indices.putIndexTemplate).toHaveBeenCalledWith({
        name: 'test-index',
        index_patterns: '.logs-test-index-default',
        template: { mappings: actionsMapping },
        priority: 500,
      });
      expect(mockEsClient.indices.create).toHaveBeenCalledWith({
        index: '.logs-test-index-default',
        mappings: actionsMapping,
      });
      expect(logger.debug).toHaveBeenCalledWith('Index test-index does not exist, creating...');
    });

    it('should update index template if mappings are outdated', async () => {
      const currentMappings = {
        properties: {
          ...actionsMapping.properties,
          // Remove a field to simulate outdated mappings
          pack_name: undefined,
        },
      };

      mockEsClient.indices.exists.mockResolvedValueOnce(true);
      mockEsClient.indices.getIndexTemplate.mockResolvedValueOnce({
        index_templates: [
          {
            name: 'test-index',
            index_template: {
              template: {
                mappings: currentMappings,
              },
            },
          },
        ],
      } as any);
      mockEsClient.indices.putIndexTemplate.mockResolvedValueOnce({ acknowledged: true } as any);
      mockEsClient.indices.putMapping.mockResolvedValueOnce({ acknowledged: true } as any);

      await createIndexIfNotExists(
        mockEsClient as unknown as ElasticsearchClient,
        'test-index',
        '.logs-test-index-default',
        actionsMapping,
        logger
      );

      expect(mockEsClient.indices.putIndexTemplate).toHaveBeenCalledWith({
        name: 'test-index',
        index_patterns: '.logs-test-index-default',
        template: { mappings: actionsMapping },
        priority: 500,
      });
      expect(mockEsClient.indices.putMapping).toHaveBeenCalledWith({
        index: '.logs-test-index-default',
        body: { properties: actionsMapping.properties },
      });
      expect(logger.debug).toHaveBeenCalledWith(
        'Index test-index already exists, checking template...'
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'Mappings for "test-index" are outdated. Updating mappings...'
      );
    });

    it('should log error if index creation fails', async () => {
      const error = new Error('Failed to create index');
      mockEsClient.indices.exists.mockRejectedValueOnce(error);

      await createIndexIfNotExists(
        mockEsClient as unknown as ElasticsearchClient,
        'test-index',
        '.logs-test-index-default',
        actionsMapping,
        logger
      );

      expect(logger.error).toHaveBeenCalledWith('Failed to create the index template: test-index');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to create index'));
    });
  });

  describe('initializeTransformsIndices', () => {
    beforeEach(() => {
      mockEsClient = createMockEsClient();
      jest.clearAllMocks();
    });

    it('should initialize both actions and action responses indices', async () => {
      mockEsClient.indices.exists.mockResolvedValue(false);
      mockEsClient.indices.putIndexTemplate.mockResolvedValue({ acknowledged: true } as any);
      mockEsClient.indices.create.mockResolvedValue({ acknowledged: true } as any);

      await initializeTransformsIndices(mockEsClient as unknown as ElasticsearchClient, logger);

      // Should call createIndexIfNotExists for both indices
      expect(mockEsClient.indices.exists).toHaveBeenCalledTimes(2);
      expect(mockEsClient.indices.putIndexTemplate).toHaveBeenCalledTimes(2);
      expect(mockEsClient.indices.create).toHaveBeenCalledTimes(2);

      // Verify actions index creation
      expect(mockEsClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(1, {
        name: ACTIONS_INDEX_NAME,
        index_patterns: ACTIONS_INDEX_DEFAULT_NS,
        template: { mappings: actionsMapping },
        priority: 500,
      });

      // Verify action responses index creation
      expect(mockEsClient.indices.putIndexTemplate).toHaveBeenNthCalledWith(2, {
        name: ACTION_RESPONSES_INDEX_NAME,
        index_patterns: ACTION_RESPONSES_INDEX_DEFAULT_NS,
        template: { mappings: actionResponsesMapping },
        priority: 500,
      });
    });

    it('should handle errors during initialization', async () => {
      const error = new Error('Failed to initialize');
      mockEsClient.indices.exists.mockRejectedValueOnce(error);

      // The second call to exists will resolve to false
      mockEsClient.indices.exists.mockResolvedValueOnce(false);
      mockEsClient.indices.putIndexTemplate.mockResolvedValue({ acknowledged: true } as any);
      mockEsClient.indices.create.mockResolvedValue({ acknowledged: true } as any);

      await initializeTransformsIndices(mockEsClient as unknown as ElasticsearchClient, logger);

      // Should still attempt to create both indices even if one fails
      expect(mockEsClient.indices.exists).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create the index template: osquery_manager.actions'
      );
    });
  });
});
