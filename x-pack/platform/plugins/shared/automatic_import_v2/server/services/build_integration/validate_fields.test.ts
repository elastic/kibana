/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { FieldMappingEntry } from '../saved_objects/saved_objects_service';
import { validateFieldMappings } from './validate_fields';

describe('validateFieldMappings', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('static validation', () => {
    it('rejects fields with unsupported types', async () => {
      const fields: FieldMappingEntry[] = [
        { name: 'my_field', type: 'not_a_real_type', is_ecs: false },
      ];

      const result = await validateFieldMappings(esClient, fields, logger);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('my_field');
      expect(result.errors[0]).toContain('not_a_real_type');
      expect(esClient.indices.simulateTemplate).not.toHaveBeenCalled();
    });

    it('rejects multiple fields with unsupported types', async () => {
      const fields: FieldMappingEntry[] = [
        { name: 'field_a', type: 'invalid_type', is_ecs: false },
        { name: 'field_b', type: 'another_bad_type', is_ecs: false },
        { name: 'field_c', type: 'keyword', is_ecs: false },
      ];

      const result = await validateFieldMappings(esClient, fields, logger);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('field_a');
      expect(result.errors[1]).toContain('field_b');
    });

    it('allows group type fields without flagging them as invalid', async () => {
      const fields: FieldMappingEntry[] = [
        { name: 'my_group', type: 'group', is_ecs: false },
        { name: 'my_group.child', type: 'keyword', is_ecs: false },
      ];

      esClient.indices.simulateTemplate.mockResolvedValueOnce({} as never);

      const result = await validateFieldMappings(esClient, fields, logger);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('ES simulation validation', () => {
    it('returns valid for fields with supported types', async () => {
      const fields: FieldMappingEntry[] = [
        { name: 'my_app.request_id', type: 'keyword', is_ecs: false },
        { name: 'my_app.count', type: 'long', is_ecs: false },
        { name: 'my_app.enabled', type: 'boolean', is_ecs: false },
      ];

      esClient.indices.simulateTemplate.mockResolvedValueOnce({} as never);

      const result = await validateFieldMappings(esClient, fields, logger);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(esClient.indices.simulateTemplate).toHaveBeenCalledTimes(1);
    });

    it('passes only custom (non-ECS) fields to the ES simulation', async () => {
      const fields: FieldMappingEntry[] = [
        { name: 'source.ip', type: 'ip', is_ecs: true },
        { name: 'event.action', type: 'keyword', is_ecs: true },
        { name: 'my_app.id', type: 'keyword', is_ecs: false },
      ];

      esClient.indices.simulateTemplate.mockResolvedValueOnce({} as never);

      await validateFieldMappings(esClient, fields, logger);

      const callArgs = esClient.indices.simulateTemplate.mock.calls[0][0] as unknown as {
        template: { mappings: { properties: Record<string, unknown> } };
      };
      const properties = callArgs.template.mappings.properties;

      expect(properties).toHaveProperty('my_app');
      expect(properties).not.toHaveProperty('source');
      expect(properties).not.toHaveProperty('event');
    });

    it('skips ES simulation when all fields are ECS', async () => {
      const fields: FieldMappingEntry[] = [
        { name: 'source.ip', type: 'ip', is_ecs: true },
        { name: 'event.action', type: 'keyword', is_ecs: true },
      ];

      const result = await validateFieldMappings(esClient, fields, logger);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(esClient.indices.simulateTemplate).not.toHaveBeenCalled();
    });

    it('returns errors when ES simulation fails', async () => {
      const fields: FieldMappingEntry[] = [{ name: 'my_app.data', type: 'keyword', is_ecs: false }];

      esClient.indices.simulateTemplate.mockRejectedValueOnce(
        new Error('mapper_parsing_exception: failed to parse field')
      );

      const result = await validateFieldMappings(esClient, fields, logger);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('mapper_parsing_exception');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('handles non-Error thrown objects gracefully', async () => {
      const fields: FieldMappingEntry[] = [{ name: 'my_field', type: 'keyword', is_ecs: false }];

      esClient.indices.simulateTemplate.mockRejectedValueOnce('string error');

      const result = await validateFieldMappings(esClient, fields, logger);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('Unknown validation error');
    });

    it('builds nested ES properties from dotted field names', async () => {
      const fields: FieldMappingEntry[] = [
        { name: 'my_app.http.request.method', type: 'keyword', is_ecs: false },
        { name: 'my_app.http.response.status_code', type: 'long', is_ecs: false },
      ];

      esClient.indices.simulateTemplate.mockResolvedValueOnce({} as never);

      await validateFieldMappings(esClient, fields, logger);

      const callArgs = esClient.indices.simulateTemplate.mock.calls[0][0] as unknown as {
        template: { mappings: { properties: Record<string, unknown> } };
      };
      const properties = callArgs.template.mappings.properties;

      expect(properties).toEqual({
        my_app: {
          type: 'object',
          properties: {
            http: {
              type: 'object',
              properties: {
                request: {
                  type: 'object',
                  properties: {
                    method: { type: 'keyword' },
                  },
                },
                response: {
                  type: 'object',
                  properties: {
                    status_code: { type: 'long' },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('uses a stable index pattern for simulation', async () => {
      const fields: FieldMappingEntry[] = [{ name: 'my_field', type: 'keyword', is_ecs: false }];

      esClient.indices.simulateTemplate.mockResolvedValueOnce({} as never);

      await validateFieldMappings(esClient, fields, logger);

      const callArgs = esClient.indices.simulateTemplate.mock.calls[0][0] as unknown as {
        index_patterns: string[];
      };
      expect(callArgs.index_patterns).toEqual(['validate_auto_import_fields-*']);
    });

    it('validates all supported ES field types pass static check', async () => {
      const supportedTypes = [
        'keyword',
        'text',
        'long',
        'integer',
        'double',
        'float',
        'date',
        'boolean',
        'ip',
        'geo_point',
        'nested',
        'object',
        'flattened',
        'wildcard',
        'constant_keyword',
        'match_only_text',
      ];

      const fields: FieldMappingEntry[] = supportedTypes.map((type, i) => ({
        name: `field_${i}`,
        type,
        is_ecs: false,
      }));

      esClient.indices.simulateTemplate.mockResolvedValueOnce({} as never);

      const result = await validateFieldMappings(esClient, fields, logger);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
