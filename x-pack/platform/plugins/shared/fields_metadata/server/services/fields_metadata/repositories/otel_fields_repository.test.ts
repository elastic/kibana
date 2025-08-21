/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OtelFieldsRepositoryDeps } from './otel_fields_repository';
import { OtelFieldsRepository } from './otel_fields_repository';
import type { TOtelFields } from '../../../../common/fields_metadata/types';

// Mock OTel semantic conventions data in the new structured format
const mockOtelFields: TOtelFields = {
  'service.name': {
    name: 'service.name',
    description: 'Logical name of the service.',
    type: 'keyword',
    example: 'shoppingcart',
  },
  'service.version': {
    name: 'service.version',
    description: 'The version string of the service API or implementation.',
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
} as const;

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
      }).toThrow(/could not validate data/);
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

      expect(Object.keys(fields)).toHaveLength(4);
      expect(fields['service.name']).toBeDefined();
      expect(fields['service.version']).toBeDefined();
      expect(fields['http.request.method']).toBeDefined();
      expect(fields['system.cpu.utilization']).toBeDefined();

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
        fieldNames: ['non.existing.field', 'another.missing.field'],
      });
      const fields = fieldsDict.getFields();

      expect(Object.keys(fields)).toHaveLength(0);
    });

    it('should return partial results when some fields exist and others do not', () => {
      const fieldsDict = otelFieldsRepository.find({
        fieldNames: ['service.name', 'non.existing.field', 'http.request.method'],
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
      expect(field!.description).toBe('The version string of the service API or implementation.');
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
});
