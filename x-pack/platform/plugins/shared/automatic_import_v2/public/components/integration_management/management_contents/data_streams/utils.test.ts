/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIconFromType, getFieldType, flattenPipelineObject, isValidIp } from './utils';

describe('data stream utils', () => {
  describe('getIconFromType', () => {
    it('should return tokenString for string type', () => {
      expect(getIconFromType('string')).toBe('tokenString');
    });

    it('should return tokenKeyword for keyword type', () => {
      expect(getIconFromType('keyword')).toBe('tokenKeyword');
    });

    it('should return tokenNumber for number type', () => {
      expect(getIconFromType('number')).toBe('tokenNumber');
    });

    it('should return tokenNumber for long type', () => {
      expect(getIconFromType('long')).toBe('tokenNumber');
    });

    it('should return tokenNumber for float type', () => {
      expect(getIconFromType('float')).toBe('tokenNumber');
    });

    it('should return tokenDate for date type', () => {
      expect(getIconFromType('date')).toBe('tokenDate');
    });

    it('should return tokenIP for ip type', () => {
      expect(getIconFromType('ip')).toBe('tokenIP');
    });

    it('should return tokenGeo for geo_point type', () => {
      expect(getIconFromType('geo_point')).toBe('tokenGeo');
    });

    it('should return tokenQuestion for object type', () => {
      expect(getIconFromType('object')).toBe('tokenQuestion');
    });

    it('should return tokenNested for nested type', () => {
      expect(getIconFromType('nested')).toBe('tokenNested');
    });

    it('should return tokenBoolean for boolean type', () => {
      expect(getIconFromType('boolean')).toBe('tokenBoolean');
    });

    it('should return tokenQuestion for undefined type', () => {
      expect(getIconFromType(undefined)).toBe('tokenQuestion');
    });

    it('should return tokenQuestion for null type', () => {
      expect(getIconFromType(null)).toBe('tokenQuestion');
    });

    it('should return tokenQuestion for unknown type', () => {
      expect(getIconFromType('unknown')).toBe('tokenQuestion');
    });
  });

  describe('getFieldType', () => {
    it('should return "null" for null value', () => {
      expect(getFieldType(null)).toBe('null');
    });

    it('should return "null" for undefined value', () => {
      expect(getFieldType(undefined)).toBe('null');
    });

    it('should return "long" for integer numbers', () => {
      expect(getFieldType(42)).toBe('long');
      expect(getFieldType(0)).toBe('long');
      expect(getFieldType(-100)).toBe('long');
    });

    it('should return "float" for decimal numbers', () => {
      expect(getFieldType(3.14)).toBe('float');
      expect(getFieldType(0.5)).toBe('float');
      expect(getFieldType(-2.5)).toBe('float');
    });

    it('should return "boolean" for boolean values', () => {
      expect(getFieldType(true)).toBe('boolean');
      expect(getFieldType(false)).toBe('boolean');
    });

    it('should return "nested" for arrays', () => {
      expect(getFieldType([])).toBe('nested');
      expect(getFieldType([1, 2, 3])).toBe('nested');
      expect(getFieldType(['a', 'b'])).toBe('nested');
    });

    it('should return "object" for objects', () => {
      expect(getFieldType({})).toBe('object');
      expect(getFieldType({ key: 'value' })).toBe('object');
    });

    it('should return "date" for date-like strings', () => {
      expect(getFieldType('2024-01-01T00:00:00Z')).toBe('date');
      expect(getFieldType('2024-12-31')).toBe('date');
    });

    it('should return "string" for regular strings', () => {
      expect(getFieldType('hello')).toBe('string');
      expect(getFieldType('test value')).toBe('string');
      expect(getFieldType('')).toBe('string');
    });

    it('should return "string" for non-date formatted strings', () => {
      expect(getFieldType('not-a-date')).toBe('string');
      expect(getFieldType('01-01-2024')).toBe('string');
    });

    it('should return "ip" for valid IPv4 addresses', () => {
      expect(getFieldType('192.0.2.1')).toBe('ip');
      expect(getFieldType('198.51.100.1')).toBe('ip');
      expect(getFieldType('203.0.113.1')).toBe('ip');
      expect(getFieldType('127.0.0.1')).toBe('ip');
      expect(getFieldType('10.0.0.1')).toBe('ip');
      expect(getFieldType('172.16.0.1')).toBe('ip');
      expect(getFieldType('192.168.0.1')).toBe('ip');
    });

    it('should return "ip" for valid IPv6 addresses', () => {
      expect(getFieldType('2001:db8::1')).toBe('ip');
      expect(getFieldType('2001:0db8:85a3::8a2e:0370:7334')).toBe('ip');
      expect(getFieldType('::1')).toBe('ip');
      expect(getFieldType('fe80::1')).toBe('ip');
      expect(getFieldType('::')).toBe('ip');
    });

    it('should return "string" for invalid IP addresses', () => {
      expect(getFieldType('256.1.1.1')).toBe('string');
      expect(getFieldType('192.0.2')).toBe('string');
      expect(getFieldType('192.0.2.1.1')).toBe('string');
      expect(getFieldType('999.999.999.999')).toBe('string');
      expect(getFieldType('not-an-ip')).toBe('string');
    });

    it('should prioritize IP detection over date detection', () => {
      expect(getFieldType('192.0.2.1')).toBe('ip');
      expect(getFieldType('198.51.100.1')).toBe('ip');
    });
  });

  describe('isValidIp', () => {
    it('should validate IPv4 addresses correctly', () => {
      expect(isValidIp('192.0.2.1')).toBe(true);
      expect(isValidIp('198.51.100.1')).toBe(true);
      expect(isValidIp('203.0.113.1')).toBe(true);
      expect(isValidIp('127.0.0.1')).toBe(true);
      expect(isValidIp('10.0.0.1')).toBe(true);
      expect(isValidIp('172.16.0.1')).toBe(true);
      expect(isValidIp('192.168.0.1')).toBe(true);
    });

    it('should validate IPv6 addresses correctly', () => {
      expect(isValidIp('2001:db8::1')).toBe(true);
      expect(isValidIp('2001:0db8:85a3::8a2e:0370:7334')).toBe(true);
      expect(isValidIp('::1')).toBe(true);
      expect(isValidIp('fe80::1')).toBe(true);
      expect(isValidIp('::')).toBe(true);
    });

    it('should reject invalid IP addresses', () => {
      expect(isValidIp('256.1.1.1')).toBe(false);
      expect(isValidIp('192.0.2')).toBe(false);
      expect(isValidIp('192.0.2.1.1')).toBe(false);
      expect(isValidIp('999.999.999.999')).toBe(false);
      expect(isValidIp('not-an-ip')).toBe(false);
      expect(isValidIp('')).toBe(false);
      expect(isValidIp('hello world')).toBe(false);
    });
  });

  describe('flattenPipelineObject', () => {
    it('should flatten a simple object', () => {
      const input = {
        field1: 'value1',
        field2: 42,
        field3: true,
      };

      const result = flattenPipelineObject(input);

      expect(result).toEqual([
        { field: 'field1', value: 'value1', type: 'string' },
        { field: 'field2', value: '42', type: 'long' },
        { field: 'field3', value: 'true', type: 'boolean' },
      ]);
    });

    it('should flatten nested objects with dot notation', () => {
      const input = {
        parent: {
          child: {
            grandchild: 'value',
          },
        },
      };

      const result = flattenPipelineObject(input);

      expect(result).toEqual([
        { field: 'parent.child.grandchild', value: 'value', type: 'string' },
      ]);
    });

    it('should handle arrays by stringifying them', () => {
      const input = {
        arrayField: [1, 2, 3],
        mixedArray: ['a', 'b', 'c'],
      };

      const result = flattenPipelineObject(input);

      expect(result).toEqual([
        { field: 'arrayField', value: '[1,2,3]', type: 'nested' },
        { field: 'mixedArray', value: '["a","b","c"]', type: 'nested' },
      ]);
    });

    it('should handle null and undefined values', () => {
      const input = {
        nullField: null,
        undefinedField: undefined,
      };

      const result = flattenPipelineObject(input);

      expect(result).toEqual([
        { field: 'nullField', value: '', type: 'null' },
        { field: 'undefinedField', value: '', type: 'null' },
      ]);
    });

    it('should handle mixed nested structure', () => {
      const input = {
        '@timestamp': '2024-01-01T00:00:00Z',
        message: 'Test log',
        user: {
          name: 'John',
          age: 30,
          roles: ['admin', 'user'],
        },
        metadata: {
          source: {
            ip: '192.0.2.1',
          },
        },
      };

      const result = flattenPipelineObject(input);

      expect(result).toContainEqual({
        field: '@timestamp',
        value: '2024-01-01T00:00:00Z',
        type: 'date',
      });
      expect(result).toContainEqual({ field: 'message', value: 'Test log', type: 'string' });
      expect(result).toContainEqual({ field: 'user.name', value: 'John', type: 'string' });
      expect(result).toContainEqual({ field: 'user.age', value: '30', type: 'long' });
      expect(result).toContainEqual({
        field: 'user.roles',
        value: '["admin","user"]',
        type: 'nested',
      });
      expect(result).toContainEqual({
        field: 'metadata.source.ip',
        value: '192.0.2.1',
        type: 'ip',
      });
    });

    it('should preserve field order', () => {
      const input = {
        first: 'a',
        second: 'b',
        third: 'c',
      };

      const result = flattenPipelineObject(input);

      expect(result[0].field).toBe('first');
      expect(result[1].field).toBe('second');
      expect(result[2].field).toBe('third');
    });

    it('should handle empty objects', () => {
      const input = {};

      const result = flattenPipelineObject(input);

      expect(result).toEqual([]);
    });

    it('should handle objects with empty nested objects', () => {
      const input = {
        parent: {},
      };

      const result = flattenPipelineObject(input);

      expect(result).toEqual([]);
    });
  });
});
