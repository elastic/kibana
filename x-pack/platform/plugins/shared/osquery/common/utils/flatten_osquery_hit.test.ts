/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenOsqueryHit, getNestedOrFlat } from './flatten_osquery_hit';
import type { ResultEdges } from '../search_strategy';

describe('flatten_osquery_hit', () => {
  describe('getNestedOrFlat', () => {
    it('resolves nested paths', () => {
      expect(getNestedOrFlat('a.b', { a: { b: 'value' } })).toBe('value');
    });

    it('resolves flat dot-notation keys', () => {
      expect(getNestedOrFlat('a.b', { 'a.b': 'flat-value' })).toBe('flat-value');
    });

    it('returns undefined for missing paths', () => {
      expect(getNestedOrFlat('missing', { other: 'value' })).toBeUndefined();
    });

    it('returns undefined for non-object source', () => {
      expect(getNestedOrFlat('path', null)).toBeUndefined();
    });
  });

  describe('flattenOsqueryHit', () => {
    it('flattens edge.fields, unwrapping single-element arrays', () => {
      const edge = {
        _id: '1',
        _index: 'test',
        fields: {
          'osquery.pid': [1234],
          'osquery.name': ['test-process'],
          'osquery.tags': ['a', 'b'],
        },
      } as unknown as ResultEdges[number];

      const result = flattenOsqueryHit(edge);
      expect(result['osquery.pid']).toBe(1234);
      expect(result['osquery.name']).toBe('test-process');
      expect(result['osquery.tags']).toEqual(['a', 'b']);
    });

    it('extracts agent fields from _source when not in fields', () => {
      const edge = {
        _id: '1',
        _index: 'test',
        fields: {},
        _source: {
          agent: { name: 'host-1', id: 'agent-123' },
        },
      } as unknown as ResultEdges[number];

      const result = flattenOsqueryHit(edge);
      expect(result['agent.name']).toBe('host-1');
      expect(result['agent.id']).toBe('agent-123');
    });

    it('prefers existing fields over _source agent values', () => {
      const edge = {
        _id: '1',
        _index: 'test',
        fields: {
          'agent.name': ['from-fields'],
          'agent.id': ['agent-from-fields'],
        },
        _source: {
          agent: { name: 'from-source', id: 'agent-from-source' },
        },
      } as unknown as ResultEdges[number];

      const result = flattenOsqueryHit(edge);
      expect(result['agent.name']).toBe('from-fields');
      expect(result['agent.id']).toBe('agent-from-fields');
    });

    it('applies ECS mapping from _source', () => {
      const edge = {
        _id: '1',
        _index: 'test',
        fields: { 'osquery.pid': [1234] },
        _source: { process: { pid: 1234 } },
      } as unknown as ResultEdges[number];

      const ecsMapping = { 'process.pid': { field: 'pid' } };

      const result = flattenOsqueryHit(edge, ecsMapping);
      expect(result['process.pid']).toBe(1234);
    });

    it('JSON-stringifies array/object ECS mapping values', () => {
      const edge = {
        _id: '1',
        _index: 'test',
        fields: {},
        _source: { tags: ['a', 'b'] },
      } as unknown as ResultEdges[number];

      const ecsMapping = { tags: { field: 'tags' } };

      const result = flattenOsqueryHit(edge, ecsMapping);
      expect(result.tags).toBe(JSON.stringify(['a', 'b'], null, 2));
    });

    it('handles empty edge gracefully', () => {
      const edge = {
        _id: '1',
        _index: 'test',
      } as unknown as ResultEdges[number];

      const result = flattenOsqueryHit(edge);
      expect(result).toEqual({});
    });
  });
});
