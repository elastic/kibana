/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { getAllRefValues, reduceSpecComponents, getAuthDetails } from './oas';
import { testSpec } from './mocks/oas_test_helper';
import type { CelAuthType } from '../../common/api/model/cel_input_attributes.gen';
import { CelAuthTypeEnum } from '../../common/api/model/cel_input_attributes.gen';

describe('oas util', () => {
  describe('getAllRefValues', () => {
    test('should return empty set for empty object', () => {
      expect(getAllRefValues({})).toEqual(new Set());
    });

    test('should return empty set for primitive values', () => {
      expect(getAllRefValues(null)).toEqual(new Set());
      expect(getAllRefValues(123)).toEqual(new Set());
      expect(getAllRefValues('string')).toEqual(new Set());
      expect(getAllRefValues(true)).toEqual(new Set());
    });

    test('should find $ref at root level', () => {
      const schema = { $ref: '#/components/schemas/User' };
      const expected = new Set(['#/components/schemas/User']);
      expect(getAllRefValues(schema)).toEqual(expected);
    });

    test('should find multiple $refs at different levels', () => {
      const schema = {
        properties: {
          user: { $ref: '#/components/schemas/User' },
          address: { $ref: '#/components/schemas/Address' },
          orders: {
            type: 'array',
            items: { $ref: '#/components/schemas/Order' },
          },
        },
      };

      const expected = new Set([
        '#/components/schemas/User',
        '#/components/schemas/Address',
        '#/components/schemas/Order',
      ]);

      expect(getAllRefValues(schema)).toEqual(expected);
    });

    test('should handle deeply nested objects', () => {
      const schema = {
        level1: {
          level2: {
            level3: {
              level4: {
                $ref: '#/deep/nested/ref',
              },
            },
          },
        },
      };

      const expected = new Set(['#/deep/nested/ref']);
      expect(getAllRefValues(schema)).toEqual(expected);
    });

    test('should handle arrays of objects', () => {
      const schema = {
        items: [
          { $ref: '#/components/schemas/Item1' },
          { $ref: '#/components/schemas/Item2' },
          {
            subItem: { $ref: '#/components/schemas/SubItem' },
          },
        ],
      };

      const expected = new Set([
        '#/components/schemas/Item1',
        '#/components/schemas/Item2',
        '#/components/schemas/SubItem',
      ]);

      expect(getAllRefValues(schema)).toEqual(expected);
    });

    test('should deduplicate repeated refs', () => {
      const schema = {
        prop1: { $ref: '#/components/schemas/Common' },
        prop2: { $ref: '#/components/schemas/Common' },
        prop3: {
          subProp: { $ref: '#/components/schemas/Common' },
        },
      };

      const expected = new Set(['#/components/schemas/Common']);
      expect(getAllRefValues(schema)).toEqual(expected);
    });

    test('should handle non-object values correctly', () => {
      const schema = {
        nullProp: null,
        boolProp: true,
        numProp: 123,
        strProp: 'hello',
        objProp: { $ref: '#/components/schemas/Valid' },
      };

      const expected = new Set(['#/components/schemas/Valid']);
      expect(getAllRefValues(schema)).toEqual(expected);
    });
  });

  describe('getAuthDetails', () => {
    it('should return Basic auth details when auth type is basic', () => {
      const mockSpecAuthDetails: Record<string, any[]> = {
        Basic: [{ key: 'basicAuth', scheme: { type: 'http', scheme: 'basic' } }],
      };
      const result = getAuthDetails(CelAuthTypeEnum.basic as CelAuthType, mockSpecAuthDetails);
      expect(result).toEqual(mockSpecAuthDetails.Basic[0]);
    });

    it('should return OAuth2 auth details when auth type is oauth2', () => {
      const mockSpecAuthDetails: Record<string, any[]> = {
        OAuth2: [{ key: 'oauth2Auth', scheme: { type: 'oauth2', flows: {} } }],
      };
      const result = getAuthDetails(CelAuthTypeEnum.oauth2 as CelAuthType, mockSpecAuthDetails);
      expect(result).toEqual(mockSpecAuthDetails.OAuth2[0]);
    });

    it('should return Header auth details when auth type is header and Header details exist', () => {
      const mockSpecAuthDetails: Record<string, any[]> = {
        Header: [
          { key: 'headerAuth', scheme: { type: 'apiKey', name: 'X-API-Key', in: 'header' } },
        ],
      };
      const result = getAuthDetails(CelAuthTypeEnum.header as CelAuthType, mockSpecAuthDetails);
      expect(result).toEqual(mockSpecAuthDetails.Header[0]);
    });

    it('should return Bearer auth details when auth type is header and Bearer details exist', () => {
      const mockSpecAuthDetails: Record<string, any[]> = {
        Bearer: [{ key: 'bearerAuth', scheme: { type: 'http', scheme: 'bearer' } }],
      };
      const result = getAuthDetails(CelAuthTypeEnum.header as CelAuthType, mockSpecAuthDetails);
      expect(result).toEqual(mockSpecAuthDetails.Bearer[0]);
    });

    it('should return apiKey auth details when auth type is header and apiKey details exist', () => {
      const mockSpecAuthDetails: Record<string, any[]> = {
        apiKey: [{ key: 'apiKeyAuth', scheme: { type: 'apiKey', name: 'api_key', in: 'header' } }],
      };
      const result = getAuthDetails(CelAuthTypeEnum.header as CelAuthType, mockSpecAuthDetails);
      expect(result).toEqual(mockSpecAuthDetails.apiKey[0]);
    });

    it('should return undefined when auth type is header and no matching auth details exist', () => {
      const mockSpecAuthDetails: Record<string, any[]> = {
        Basic: [{ key: 'basicAuth', scheme: { type: 'http', scheme: 'basic' } }],
      };
      const result = getAuthDetails(CelAuthTypeEnum.header as CelAuthType, mockSpecAuthDetails);
      expect(result).toBeUndefined();
    });

    it('should return http auth details when auth type is digest', () => {
      const mockSpecAuthDetails: Record<string, any[]> = {
        http: [{ key: 'digestAuth', scheme: { type: 'http', scheme: 'digest' } }],
      };
      const result = getAuthDetails(CelAuthTypeEnum.digest as CelAuthType, mockSpecAuthDetails);
      expect(result).toEqual(mockSpecAuthDetails.http[0]);
    });

    it('should return undefined when specAuthDetails is undefined', () => {
      const result = getAuthDetails(CelAuthTypeEnum.basic as CelAuthType, undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined when auth type exists but array is empty', () => {
      const mockSpecAuthDetails: Record<string, any[]> = {
        Basic: [],
      };
      const result = getAuthDetails(CelAuthTypeEnum.basic as CelAuthType, mockSpecAuthDetails);
      expect(result).toBeUndefined();
    });

    it('should throw error for unsupported auth method', () => {
      const mockSpecAuthDetails: Record<string, any[]> = {
        Basic: [{ key: 'basicAuth', scheme: { type: 'http', scheme: 'basic' } }],
      };
      expect(() => {
        getAuthDetails('unsupported' as CelAuthType, mockSpecAuthDetails);
      }).toThrow('unsupported auth method');
    });
  });

  describe('full test', () => {
    it('reduceSpecComponents', () => {
      const reducedSpec = reduceSpecComponents(testSpec, '/v1/device_tasks');
      expect(reducedSpec).toBeDefined();
      // only will return the top level refs mentioned in the response object
      expect(Object.keys(Object.keys(reducedSpec?.schemas ?? [])).length).toBe(2);
    });
  });
});
