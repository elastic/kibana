/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createProxiedFieldsMap } from './create_proxied_fields_map';
import { FieldMetadata } from '../models/field_metadata';

describe('createProxiedFieldsMap', () => {
  const mockBaseFields = {
    '@timestamp': FieldMetadata.create({
      name: '@timestamp',
      flat_name: '@timestamp',
      type: 'date',
      description: 'Timestamp field',
      source: 'ecs',
    }),
    'service.name': FieldMetadata.create({
      name: 'service.name',
      flat_name: 'service.name',
      type: 'keyword',
      description: 'Service name',
      source: 'ecs',
    }),
    'host.name': FieldMetadata.create({
      name: 'host.name',
      flat_name: 'host.name',
      type: 'keyword',
      description: 'Host name',
      source: 'ecs',
    }),
  };

  describe('direct field access', () => {
    it('should return base fields when accessed directly', () => {
      const proxiedFields = createProxiedFieldsMap(mockBaseFields);

      expect(proxiedFields['@timestamp']).toBeDefined();
      expect(proxiedFields['@timestamp'].name).toBe('@timestamp');
      expect(proxiedFields['service.name']).toBeDefined();
      expect(proxiedFields['service.name'].name).toBe('service.name');
    });
  });

  describe('attributes.* prefixed access', () => {
    it('should create prefixed variant for attributes.* fields', () => {
      const proxiedFields = createProxiedFieldsMap(mockBaseFields);

      const prefixedField = proxiedFields['attributes.service.name'];
      expect(prefixedField).toBeDefined();
      expect(prefixedField?.name).toBe('attributes.service.name');
      expect(prefixedField?.flat_name).toBe('attributes.service.name');
      expect(prefixedField?.type).toBe('keyword');
      expect(prefixedField?.description).toBe('Service name');
    });

    it('should return undefined for non-existent base field', () => {
      const proxiedFields = createProxiedFieldsMap(mockBaseFields);

      expect(proxiedFields['attributes.nonexistent.field']).toBeUndefined();
    });
  });

  describe('resource.attributes.* prefixed access', () => {
    it('should create prefixed variant for resource.attributes.* fields', () => {
      const proxiedFields = createProxiedFieldsMap(mockBaseFields);

      const prefixedField = proxiedFields['resource.attributes.host.name'];
      expect(prefixedField).toBeDefined();
      expect(prefixedField?.name).toBe('resource.attributes.host.name');
      expect(prefixedField?.flat_name).toBe('resource.attributes.host.name');
      expect(prefixedField?.type).toBe('keyword');
      expect(prefixedField?.description).toBe('Host name');
    });

    it('should return undefined for non-existent base field', () => {
      const proxiedFields = createProxiedFieldsMap(mockBaseFields);

      expect(proxiedFields['resource.attributes.nonexistent.field']).toBeUndefined();
    });
  });

  describe('has operator', () => {
    it('should return true for base fields', () => {
      const proxiedFields = createProxiedFieldsMap(mockBaseFields);

      expect('service.name' in proxiedFields).toBe(true);
      expect('@timestamp' in proxiedFields).toBe(true);
    });

    it('should return true for prefixed fields that can be created', () => {
      const proxiedFields = createProxiedFieldsMap(mockBaseFields);

      expect('attributes.service.name' in proxiedFields).toBe(true);
      expect('resource.attributes.host.name' in proxiedFields).toBe(true);
    });

    it('should return false for non-existent fields', () => {
      const proxiedFields = createProxiedFieldsMap(mockBaseFields);

      expect('nonexistent' in proxiedFields).toBe(false);
      expect('attributes.nonexistent' in proxiedFields).toBe(false);
      expect('resource.attributes.nonexistent' in proxiedFields).toBe(false);
    });
  });

  describe('enumeration', () => {
    it('should only enumerate base fields to avoid payload bloat', () => {
      const proxiedFields = createProxiedFieldsMap(mockBaseFields);

      const keys = Object.keys(proxiedFields);
      expect(keys).toEqual(['@timestamp', 'service.name', 'host.name']);
      // Prefixed variants should not be enumerated
      expect(keys).not.toContain('attributes.service.name');
      expect(keys).not.toContain('resource.attributes.host.name');
    });
  });

  describe('consistency across access patterns', () => {
    it('should return equivalent fields for different access patterns', () => {
      const proxiedFields = createProxiedFieldsMap(mockBaseFields);

      const baseField = proxiedFields['service.name'];
      const attributesField = proxiedFields['attributes.service.name'];
      const resourceAttributesField = proxiedFields['resource.attributes.service.name'];

      // All should have the same type and description
      expect(baseField?.type).toBe('keyword');
      expect(attributesField?.type).toBe('keyword');
      expect(resourceAttributesField?.type).toBe('keyword');

      expect(baseField?.description).toBe('Service name');
      expect(attributesField?.description).toBe('Service name');
      expect(resourceAttributesField?.description).toBe('Service name');

      // But different names
      expect(baseField?.name).toBe('service.name');
      expect(attributesField?.name).toBe('attributes.service.name');
      expect(resourceAttributesField?.name).toBe('resource.attributes.service.name');
    });
  });
});
