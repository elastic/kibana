/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { __test__ } from './route';

describe('schemaFieldsSimulationRoute', () => {
  describe('getSimulatableFieldDefinitions', () => {
    it('filters out documentation-only (typeless) overrides', () => {
      const result = __test__.getSimulatableFieldDefinitions([
        { name: 'attributes.message', description: 'docs only' },
        { name: 'attributes.user.id', type: 'keyword' },
      ] as any);

      expect(result).toEqual([{ name: 'attributes.user.id', type: 'keyword' }]);
    });

    it('returns an empty array when only doc-only overrides are provided', () => {
      const result = __test__.getSimulatableFieldDefinitions([
        { name: 'attributes.message', description: 'docs only' },
        { name: 'attributes.user.id', description: 'docs only' },
      ] as any);

      expect(result).toEqual([]);
    });

    it('filters out UI-only pseudo-types (unmapped/system)', () => {
      const result = __test__.getSimulatableFieldDefinitions([
        { name: 'attributes.foo', type: 'unmapped', description: 'docs' },
        { name: 'attributes.bar', type: 'system', description: 'docs' },
        { name: 'attributes.baz', type: 'boolean' },
      ] as any);

      expect(result).toEqual([{ name: 'attributes.baz', type: 'boolean' }]);
    });

    it('returns an empty array when only UI-only pseudo-types are provided', () => {
      const result = __test__.getSimulatableFieldDefinitions([
        { name: 'attributes.foo', type: 'unmapped', description: 'docs' },
        { name: 'attributes.bar', type: 'system', description: 'docs' },
      ] as any);

      expect(result).toEqual([]);
    });

    it('keeps multiple mapping-affecting definitions', () => {
      const result = __test__.getSimulatableFieldDefinitions([
        { name: 'attributes.a', type: 'keyword' },
        { name: 'attributes.b', type: 'geo_point' },
      ] as any);

      expect(result).toEqual([
        { name: 'attributes.a', type: 'keyword' },
        { name: 'attributes.b', type: 'geo_point' },
      ]);
    });
  });
});

