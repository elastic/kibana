/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OtelFieldsRepositoryDeps } from './otel_fields_repository';
import { OtelFieldsRepository } from './otel_fields_repository';
import type { OtelFieldName, TOtelFields } from '../../../../common/fields_metadata/types';

// Mock OTel semantic conventions data in the new structured format
const mockOtelFields = {
  'service.name': {
    name: 'service.name',
    description: 'Logical name of the service.',
    type: 'keyword',
    example: 'shoppingcart',
  },
  'service.version': {
    name: 'service.version',
    description:
      'The version string of the service component. The format is not defined by these conventions.',
    type: 'keyword',
    example: '2.0.0',
  },
  'http.request.method': {
    name: 'http.request.method',
    description: 'HTTP request method.',
    type: 'keyword',
    example: 'GET',
  },
  'system.cpu.utilization': {
    name: 'system.cpu.utilization',
    description:
      'Difference in system.cpu.time since the last measurement, divided by the elapsed time and number of CPUs available to the process.',
    type: 'double',
  },
  'cloud.account.id': {
    name: 'cloud.account.id',
    description: 'The cloud account ID the resource is assigned to.',
    type: 'keyword',
    example: '111111111111',
  },
  'cloud.provider': {
    name: 'cloud.provider',
    description: 'Name of the cloud provider.',
    type: 'keyword',
    example: 'aws',
  },
} as Partial<TOtelFields>;

describe('OtelFieldsRepository', () => {
  let otelFieldsRepository: OtelFieldsRepository;

  beforeEach(() => {
    otelFieldsRepository = OtelFieldsRepository.create({
      otelFields: mockOtelFields as OtelFieldsRepositoryDeps['otelFields'],
    });
  });

  describe('constructor and creation', () => {
    it('should create an instance successfully with valid otel fields', () => {
      expect(otelFieldsRepository).toBeInstanceOf(OtelFieldsRepository);
    });

    it('should throw an error with invalid otel fields structure', () => {
      const invalidOtelFields = {
        'invalid.field': 'just a string instead of object',
      };

      expect(() => {
        OtelFieldsRepository.create({
          otelFields: invalidOtelFields as any,
        });
      }).toThrow(/Invalid field data/);
    });

    it('should handle empty otel fields object', () => {
      const emptyOtelFields = {};
      const repository = OtelFieldsRepository.create({
        otelFields: emptyOtelFields as any,
      });

      expect(repository).toBeInstanceOf(OtelFieldsRepository);
    });
  });

  describe('getByName method', () => {
    it('should return field metadata for existing OTel field', () => {
      const field = otelFieldsRepository.getByName('service.name');

      expect(field).toBeDefined();
      expect(field!.name).toBe('service.name');
      expect(field!.description).toBe('Logical name of the service.');
      expect(field!.type).toBe('keyword');
      expect(field!.example).toBe('shoppingcart');
      expect(field!.source).toBe('otel');
    });

    it('should return field metadata for existing OTel field without example', () => {
      const field = otelFieldsRepository.getByName('system.cpu.utilization');

      expect(field).toBeDefined();
      expect(field!.name).toBe('system.cpu.utilization');
      expect(field!.description).toBe(
        'Difference in system.cpu.time since the last measurement, divided by the elapsed time and number of CPUs available to the process.'
      );
      expect(field!.type).toBe('double');
      expect(field!.example).toBeUndefined();
      expect(field!.source).toBe('otel');
    });

    it('should return undefined for non-existing field', () => {
      const field = otelFieldsRepository.getByName('non.existing.field');

      expect(field).toBeUndefined();
    });

    it('should handle empty string field name', () => {
      const field = otelFieldsRepository.getByName('');

      expect(field).toBeUndefined();
    });

    it('should handle special characters in field names', () => {
      // Add a field with special characters to test
      const specialOtelFields = {
        ...mockOtelFields,
        'field-with.special_chars': {
          name: 'field-with.special_chars',
          description: 'Field with special characters',
          type: 'keyword',
        },
      } as const;

      const repository = OtelFieldsRepository.create({
        otelFields: specialOtelFields as any,
      });

      const field = repository.getByName('field-with.special_chars');
      expect(field).toBeDefined();
      expect(field!.name).toBe('field-with.special_chars');
    });
  });

  describe('find method', () => {
    it('should return all fields when no fieldNames specified', () => {
      const fieldsDict = otelFieldsRepository.find();
      const fields = fieldsDict.getFields();

      expect(Object.keys(fields)).toHaveLength(6);
      expect(fields['service.name']).toBeDefined();
      expect(fields['service.version']).toBeDefined();
      expect(fields['http.request.method']).toBeDefined();
      expect(fields['system.cpu.utilization']).toBeDefined();
      expect(fields['cloud.account.id']).toBeDefined();
      expect(fields['cloud.provider']).toBeDefined();

      // Verify all fields have 'otel' source
      Object.values(fields).forEach((field) => {
        expect(field.source).toBe('otel');
      });
    });

    it('should return specific fields when fieldNames are provided', () => {
      const fieldsDict = otelFieldsRepository.find({
        fieldNames: ['service.name', 'http.request.method'],
      });
      const fields = fieldsDict.getFields();

      expect(Object.keys(fields)).toHaveLength(2);
      expect(fields['service.name']).toBeDefined();
      expect(fields['http.request.method']).toBeDefined();
      expect(fields['service.version']).toBeUndefined();
      expect(fields['system.cpu.utilization']).toBeUndefined();
    });

    it('should return empty dictionary when no matching fields found', () => {
      const fieldsDict = otelFieldsRepository.find({
        fieldNames: [
          'non.existing.field' as OtelFieldName,
          'another.missing.field' as OtelFieldName,
        ],
      });
      const fields = fieldsDict.getFields();

      expect(Object.keys(fields)).toHaveLength(0);
    });

    it('should return partial results when some fields exist and others do not', () => {
      const fieldsDict = otelFieldsRepository.find({
        fieldNames: ['service.name', 'non.existing.field' as OtelFieldName, 'http.request.method'],
      });
      const fields = fieldsDict.getFields();

      expect(Object.keys(fields)).toHaveLength(2);
      expect(fields['service.name']).toBeDefined();
      expect(fields['http.request.method']).toBeDefined();
      expect(fields['non.existing.field']).toBeUndefined();
    });

    it('should handle empty fieldNames array', () => {
      const fieldsDict = otelFieldsRepository.find({ fieldNames: [] });
      const fields = fieldsDict.getFields();

      expect(Object.keys(fields)).toHaveLength(0);
    });

    it('should handle duplicate field names in search', () => {
      const fieldsDict = otelFieldsRepository.find({
        fieldNames: ['service.name', 'service.name', 'http.request.method'],
      });
      const fields = fieldsDict.getFields();

      expect(Object.keys(fields)).toHaveLength(2);
      expect(fields['service.name']).toBeDefined();
      expect(fields['http.request.method']).toBeDefined();
    });
  });

  describe('data conversion and validation', () => {
    it('should properly convert structured semconv data to FieldMetadata format', () => {
      const field = otelFieldsRepository.getByName('service.name');

      // Verify conversion from structured format to FieldMetadata
      expect(field!.name).toBe('service.name');
      expect(field!.description).toBe('Logical name of the service.');
      expect(field!.type).toBe('keyword');
      expect(field!.example).toBe('shoppingcart');
      expect(field!.source).toBe('otel');
    });

    it('should handle fields without examples gracefully', () => {
      const field = otelFieldsRepository.getByName('system.cpu.utilization');

      expect(field!.name).toBe('system.cpu.utilization');
      expect(field!.description).toBeDefined();
      expect(field!.type).toBe('double');
      expect(field!.example).toBeUndefined();
      expect(field!.source).toBe('otel');
    });
  });

  describe('field metadata properties', () => {
    it('should preserve all field metadata properties correctly', () => {
      const field = otelFieldsRepository.getByName('service.version');

      expect(field!.name).toBe('service.version');
      expect(field!.description).toBe(
        'The version string of the service component. The format is not defined by these conventions.'
      );
      expect(field!.type).toBe('keyword');
      expect(field!.example).toBe('2.0.0');
      expect(field!.source).toBe('otel');

      // Verify it's a proper FieldMetadata instance
      expect(typeof field!.toPlain).toBe('function');
    });

    it('should ensure all returned fields have otel source', () => {
      const fieldsDict = otelFieldsRepository.find();
      const fields = fieldsDict.getFields();

      Object.values(fields).forEach((field) => {
        expect(field.source).toBe('otel');
      });
    });
  });

  describe('prefix stripping functionality', () => {
    describe('getByName method with prefixes', () => {
      it('should strip "resource.attributes." prefix and find field', () => {
        const field = otelFieldsRepository.getByName('resource.attributes.cloud.account.id');

        expect(field).toBeDefined();
        expect(field!.name).toBe('cloud.account.id');
        expect(field!.description).toBe('The cloud account ID the resource is assigned to.');
        expect(field!.type).toBe('keyword');
        expect(field!.example).toBe('111111111111');
        expect(field!.source).toBe('otel');
      });

      it('should strip "scope.attributes." prefix and find field', () => {
        const field = otelFieldsRepository.getByName('scope.attributes.cloud.account.id');

        expect(field).toBeDefined();
        expect(field!.name).toBe('cloud.account.id');
        expect(field!.description).toBe('The cloud account ID the resource is assigned to.');
        expect(field!.type).toBe('keyword');
        expect(field!.example).toBe('111111111111');
        expect(field!.source).toBe('otel');
      });

      it('should strip "attributes." prefix and find field', () => {
        const field = otelFieldsRepository.getByName('attributes.service.name');

        expect(field).toBeDefined();
        expect(field!.name).toBe('service.name');
        expect(field!.description).toBe('Logical name of the service.');
        expect(field!.type).toBe('keyword');
        expect(field!.example).toBe('shoppingcart');
        expect(field!.source).toBe('otel');
      });

      it('should return original field when no prefix matches', () => {
        const field = otelFieldsRepository.getByName('cloud.provider');

        expect(field).toBeDefined();
        expect(field!.name).toBe('cloud.provider');
        expect(field!.description).toBe('Name of the cloud provider.');
        expect(field!.type).toBe('keyword');
        expect(field!.example).toBe('aws');
        expect(field!.source).toBe('otel');
      });

      it('should return undefined for non-existing field even after stripping', () => {
        const field = otelFieldsRepository.getByName('resource.attributes.non.existing.field');

        expect(field).toBeUndefined();
      });

      it('should handle multiple prefix types correctly', () => {
        const resourceField = otelFieldsRepository.getByName('resource.attributes.service.version');
        const scopeField = otelFieldsRepository.getByName('scope.attributes.service.version');
        const attributesField = otelFieldsRepository.getByName('attributes.service.version');
        const normalField = otelFieldsRepository.getByName('service.version');

        // All should return the same field metadata
        expect(resourceField).toBeDefined();
        expect(scopeField).toBeDefined();
        expect(attributesField).toBeDefined();
        expect(normalField).toBeDefined();

        expect(resourceField!.name).toBe('service.version');
        expect(scopeField!.name).toBe('service.version');
        expect(attributesField!.name).toBe('service.version');
        expect(normalField!.name).toBe('service.version');
      });

      it('should handle edge cases with prefix stripping', () => {
        // Test field names that start with prefix but don't have content after
        expect(otelFieldsRepository.getByName('resource.attributes.')).toBeUndefined();
        expect(otelFieldsRepository.getByName('scope.attributes.')).toBeUndefined();
        expect(otelFieldsRepository.getByName('attributes.')).toBeUndefined();

        // Test partial matches that shouldn't be stripped
        expect(otelFieldsRepository.getByName('resource.attribute.service.name')).toBeUndefined();
        expect(otelFieldsRepository.getByName('scope.attribute.service.name')).toBeUndefined();
        expect(otelFieldsRepository.getByName('attribute.service.name')).toBeUndefined();
      });
    });

    describe('find method with prefixes', () => {
      it('should strip prefixes internally but return fields with original requested names as keys', () => {
        const fieldsDict = otelFieldsRepository.find({
          fieldNames: [
            'resource.attributes.cloud.account.id' as OtelFieldName,
            'scope.attributes.service.name' as OtelFieldName,
            'attributes.http.request.method' as OtelFieldName,
            'cloud.provider', // no prefix
          ],
        });
        const fields = fieldsDict.getFields();

        expect(Object.keys(fields)).toHaveLength(4);

        // Check that keys are the original requested field names
        expect(fields['resource.attributes.cloud.account.id']).toBeDefined();
        expect(fields['scope.attributes.service.name']).toBeDefined();
        expect(fields['attributes.http.request.method']).toBeDefined();
        expect(fields['cloud.provider']).toBeDefined();

        // Verify field contents show the actual resolved field names
        expect(fields['resource.attributes.cloud.account.id'].name).toBe('cloud.account.id');
        expect(fields['scope.attributes.service.name'].name).toBe('service.name');
        expect(fields['attributes.http.request.method'].name).toBe('http.request.method');
        expect(fields['cloud.provider'].name).toBe('cloud.provider');
      });

      it('should handle mixed existing and non-existing fields with prefixes', () => {
        const fieldsDict = otelFieldsRepository.find({
          fieldNames: [
            'resource.attributes.cloud.account.id' as OtelFieldName, // exists
            'scope.attributes.non.existing.field' as OtelFieldName, // doesn't exist
            'attributes.service.name' as OtelFieldName, // exists
          ],
        });
        const fields = fieldsDict.getFields();

        expect(Object.keys(fields)).toHaveLength(2);
        expect(fields['resource.attributes.cloud.account.id']).toBeDefined();
        expect(fields['attributes.service.name']).toBeDefined();
        expect(fields['scope.attributes.non.existing.field']).toBeUndefined();
      });

      it('should return separate entries for different prefixed requests of the same field', () => {
        const fieldsDict = otelFieldsRepository.find({
          fieldNames: [
            'resource.attributes.service.name' as OtelFieldName,
            'scope.attributes.service.name' as OtelFieldName,
            'attributes.service.name' as OtelFieldName,
            'service.name', // all resolve to the same field
          ],
        });
        const fields = fieldsDict.getFields();

        // Should have separate entries for each requested field name
        expect(Object.keys(fields)).toHaveLength(4);
        expect(fields['resource.attributes.service.name']).toBeDefined();
        expect(fields['scope.attributes.service.name']).toBeDefined();
        expect(fields['attributes.service.name']).toBeDefined();
        expect(fields['service.name']).toBeDefined();

        // All should resolve to the same underlying field
        expect(fields['resource.attributes.service.name'].name).toBe('service.name');
        expect(fields['scope.attributes.service.name'].name).toBe('service.name');
        expect(fields['attributes.service.name'].name).toBe('service.name');
        expect(fields['service.name'].name).toBe('service.name');
      });

      it('should handle complex field names with prefixes', () => {
        const fieldsDict = otelFieldsRepository.find({
          fieldNames: [
            'resource.attributes.http.request.method' as OtelFieldName,
            'scope.attributes.cloud.account.id' as OtelFieldName,
            'attributes.system.cpu.utilization' as OtelFieldName,
          ],
        });
        const fields = fieldsDict.getFields();

        expect(Object.keys(fields)).toHaveLength(3);
        expect(fields['resource.attributes.http.request.method']).toBeDefined();
        expect(fields['scope.attributes.cloud.account.id']).toBeDefined();
        expect(fields['attributes.system.cpu.utilization']).toBeDefined();
      });

      it('should return empty results when all prefixed fields are non-existing', () => {
        const fieldsDict = otelFieldsRepository.find({
          fieldNames: [
            'resource.attributes.non.existing.field' as OtelFieldName,
            'scope.attributes.missing.field' as OtelFieldName,
            'attributes.another.missing.field' as OtelFieldName,
          ],
        });
        const fields = fieldsDict.getFields();

        expect(Object.keys(fields)).toHaveLength(0);
      });
    });

    describe('prefix stripping edge cases', () => {
      it('should not strip partial prefix matches', () => {
        // These should not be stripped because they don't match the full prefix
        const partialResource = otelFieldsRepository.getByName('resource.attr.service.name');
        const partialScope = otelFieldsRepository.getByName('scope.attr.service.name');
        const partialAttributes = otelFieldsRepository.getByName('attr.service.name');

        expect(partialResource).toBeUndefined();
        expect(partialScope).toBeUndefined();
        expect(partialAttributes).toBeUndefined();
      });

      it('should handle empty strings and special characters', () => {
        expect(otelFieldsRepository.getByName('')).toBeUndefined();
        expect(otelFieldsRepository.getByName('resource.attributes.')).toBeUndefined();
        expect(otelFieldsRepository.getByName('scope.attributes.')).toBeUndefined();
        expect(otelFieldsRepository.getByName('attributes.')).toBeUndefined();
      });

      it('should preserve case sensitivity in field names', () => {
        // OTel field names are case sensitive
        const field = otelFieldsRepository.getByName('resource.attributes.Service.Name');
        expect(field).toBeUndefined(); // Should not match 'service.name'
      });
    });
  });
});
