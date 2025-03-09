/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingObjectProperty, MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { InheritedFieldDefinition, WiredStreamDefinition } from '@kbn/streams-schema';
import {
  moveFieldsToNamespaces,
  addAliasesForNamespacedFields,
  baseMappings,
  baseFields,
} from './logs_layer';

describe('logs_layer', () => {
  describe('moveFieldsToNamespaces', () => {
    it('should move fields with namespace prefixes to their appropriate locations', () => {
      const mappings: Record<string, MappingProperty> = {
        '@timestamp': { type: 'date' },
        'resource.attributes.service.name': { type: 'keyword' },
        'attributes.customer.id': { type: 'keyword' },
        'body.structured.order.total': { type: 'float' },
        'scope.attributes.operation': { type: 'keyword' },
        'regular.field': { type: 'keyword' },
      };

      // Set up the basic structure needed for namespaces
      const initialStructure: Record<string, MappingProperty> = {
        resource: {
          type: 'object',
          properties: {
            attributes: {
              type: 'object',
              subobjects: false,
            },
          },
        },
        attributes: {
          type: 'object',
          subobjects: false,
        },
        body: {
          type: 'object',
          properties: {
            structured: {
              type: 'flattened',
            },
          },
        },
        scope: {
          type: 'object',
          properties: {
            attributes: {
              type: 'object',
              subobjects: false,
            },
          },
        },
      };

      const result = moveFieldsToNamespaces({ ...initialStructure, ...mappings });

      // Regular fields should remain untouched
      expect(result['@timestamp']).toEqual({ type: 'date' });
      expect(result['regular.field']).toEqual({ type: 'keyword' });

      // Prefixed fields should be moved
      expect(
        ((result.resource as MappingObjectProperty).properties?.attributes as MappingObjectProperty)
          .properties?.['service.name']
      ).toEqual({
        type: 'keyword',
      });
      expect((result.attributes as MappingObjectProperty).properties?.['customer.id']).toEqual({
        type: 'keyword',
      });
      expect(
        ((result.body as MappingObjectProperty).properties?.structured as MappingObjectProperty)
          .properties?.['order.total']
      ).toEqual({
        type: 'float',
      });
      expect(
        ((result.scope as MappingObjectProperty).properties?.attributes as MappingObjectProperty)
          .properties?.operation
      ).toEqual({
        type: 'keyword',
      });

      // Original prefixed fields should be removed
      expect(result['resource.attributes.service.name']).toBeUndefined();
      expect(result['attributes.customer.id']).toBeUndefined();
      expect(result['body.structured.order.total']).toBeUndefined();
      expect(result['scope.attributes.operation']).toBeUndefined();
    });

    it('should handle empty mappings', () => {
      const result = moveFieldsToNamespaces({});
      expect(result).toEqual({});
    });

    it('should throw error when namespace path is invalid', () => {
      const mappings: Record<string, MappingProperty> = {
        'resource.attributes.service.name': { type: 'keyword' },
        // No 'resource' path defined in the mappings
      };

      expect(() => moveFieldsToNamespaces(mappings)).toThrow(
        'Namespace path resource.attributes is invalid'
      );
    });

    it('should handle multiple fields for the same namespace', () => {
      const mappings: Record<string, MappingProperty> = {
        'attributes.id': { type: 'keyword' },
        'attributes.name': { type: 'keyword' },
        'attributes.email': { type: 'keyword' },
      };

      // Set up the basic structure needed for namespaces
      const initialStructure: Record<string, MappingProperty> = {
        attributes: {
          type: 'object',
          subobjects: false,
        },
      };

      const result = moveFieldsToNamespaces({ ...initialStructure, ...mappings });

      expect((result.attributes as MappingObjectProperty).properties).toEqual({
        id: { type: 'keyword' },
        name: { type: 'keyword' },
        email: { type: 'keyword' },
      });
    });
  });

  describe('addAliasesForNamespacedFields', () => {
    let mockStreamDefinition: WiredStreamDefinition;
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
      } as unknown as WiredStreamDefinition;

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
      } as unknown as WiredStreamDefinition;

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

      // 'user' should point to 'attributes.user' as 'attributes.' comes later in the namespacePrefixes array
      expect(result.user).toEqual({
        type: 'keyword',
        from: 'service-a',
        alias_for: 'resource.attributes.user',
      });
    });
  });
});
