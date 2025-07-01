/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InheritedFieldDefinition, Streams } from '@kbn/streams-schema';
import { addAliasesForNamespacedFields, baseMappings, baseFields } from './logs_layer';

describe('logs_layer', () => {
  describe('addAliasesForNamespacedFields', () => {
    let mockStreamDefinition: Streams.WiredStream.Definition;
    let mockInheritedFields: InheritedFieldDefinition;

    beforeEach(() => {
      // Mock stream definition
      mockStreamDefinition = {
        name: 'test-stream',
        ingest: {
          wired: {
            fields: {
              'resource.attributes.host.name': { type: 'keyword' },
              'attributes.transaction.id': { type: 'keyword' },
              'regular.field': { type: 'keyword' },
            },
          },
        },
      } as unknown as Streams.WiredStream.Definition;

      // Mock inherited fields
      mockInheritedFields = {
        'resource.attributes.service.name': {
          type: 'keyword',
          from: 'parent-stream',
        },
        'body.structured.data': {
          type: 'keyword',
          from: 'grandparent-stream',
        },
        '@timestamp': {
          type: 'date',
          from: 'system',
        },
      };
    });

    it('should create aliases for all namespaced fields', () => {
      const result = addAliasesForNamespacedFields(mockStreamDefinition, {
        ...mockInheritedFields,
      });

      // Aliases for inherited fields
      expect(result['service.name']).toEqual({
        type: 'keyword',
        from: 'parent-stream',
        alias_for: 'resource.attributes.service.name',
      });

      expect(result.data).toEqual({
        type: 'keyword',
        from: 'grandparent-stream',
        alias_for: 'body.structured.data',
      });

      // Aliases for stream fields
      expect(result['host.name']).toEqual({
        type: 'keyword',
        from: 'test-stream',
        alias_for: 'resource.attributes.host.name',
      });

      expect(result['transaction.id']).toEqual({
        type: 'keyword',
        from: 'test-stream',
        alias_for: 'attributes.transaction.id',
      });

      // Regular fields should not have aliases
      expect(result['regular.field']).toBeUndefined();
    });

    it('should include aliases from base mappings', () => {
      // Use real base mappings and base fields
      const result = addAliasesForNamespacedFields(mockStreamDefinition, {
        ...mockInheritedFields,
      });

      // Check for base alias mappings
      Object.entries(baseMappings).forEach(([key, mapping]) => {
        if (mapping.type === 'alias' && mapping.path) {
          expect(result[key]).toEqual({
            type: baseFields[mapping.path].type,
            alias_for: mapping.path,
            from: 'logs',
          });
        }
      });

      // Verify specific examples
      expect(result['log.level']).toEqual({
        type: 'keyword',
        alias_for: 'severity_text',
        from: 'logs',
      });

      expect(result.message).toEqual({
        type: 'match_only_text',
        alias_for: 'body.text',
        from: 'logs',
      });
    });

    it('should handle empty fields', () => {
      const emptyStreamDefinition = {
        name: 'empty-stream',
        ingest: {
          wired: {
            fields: {},
          },
        },
      } as unknown as Streams.WiredStream.Definition;

      const result = addAliasesForNamespacedFields(emptyStreamDefinition, {});

      // Should only contain base aliases
      const baseAliasCount = Object.values(baseMappings).filter(
        (mapping) => mapping.type === 'alias'
      ).length;
      expect(Object.keys(result).length).toBe(baseAliasCount);
    });

    it('should handle conflicting aliases', () => {
      // Create a scenario where two different namespaced fields would map to the same alias
      const conflictingFields: InheritedFieldDefinition = {
        'resource.attributes.user': {
          type: 'keyword',
          from: 'service-a',
        },
        'attributes.user': {
          type: 'keyword',
          from: 'service-b',
        },
      };

      // The resource alias should overwrite the attributes due to the order of namespacePrefixes
      const result = addAliasesForNamespacedFields(
        {
          ...mockStreamDefinition,
          ingest: {
            wired: {
              fields: {},
              routing: [],
            },
            lifecycle: { inherit: {} },
            processing: [],
          },
        },
        conflictingFields
      );

      // 'user' should point to 'resource.attributes.user' as 'resource.attributes.' comes later in the namespacePrefixes array
      expect(result.user).toEqual({
        type: 'keyword',
        from: 'service-a',
        alias_for: 'resource.attributes.user',
      });
    });
  });
});
