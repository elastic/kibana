/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getNestedOrFlat,
  flattenOsqueryHit,
  transformEdgesToRecords,
  getRecordFieldValue,
} from './transform_results';
import type { ResultEdges } from '../../common/search_strategy';

describe('transform_results', () => {
  describe('getNestedOrFlat', () => {
    it('resolves nested dot paths via lodash get', () => {
      const source = { agent: { name: 'host-1' } };
      expect(getNestedOrFlat('agent.name', source)).toBe('host-1');
    });

    it('falls back to flat dot-notation key', () => {
      const source = { 'agent.name': 'flat-host' };
      expect(getNestedOrFlat('agent.name', source)).toBe('flat-host');
    });

    it('prefers flat dot-notation key when both exist (lodash behavior)', () => {
      const source = { agent: { name: 'nested-host' }, 'agent.name': 'flat-host' };
      expect(getNestedOrFlat('agent.name', source)).toBe('flat-host');
    });

    it('returns undefined when field does not exist', () => {
      expect(getNestedOrFlat('missing.field', {})).toBeUndefined();
    });

    it('resolves deeply nested paths', () => {
      const source = { a: { b: { c: 'deep' } } };
      expect(getNestedOrFlat('a.b.c', source)).toBe('deep');
    });
  });

  describe('flattenOsqueryHit', () => {
    it('unwraps single-element arrays from fields', () => {
      const hit = {
        _index: 'logs-osquery',
        _id: '1',
        fields: {
          'osquery.name': ['myhost'],
          'osquery.pid': [1234],
        },
        _source: {},
      };
      const result = flattenOsqueryHit(hit as unknown as ResultEdges[number]);
      expect(result['osquery.name']).toBe('myhost');
      expect(result['osquery.pid']).toBe(1234);
    });

    it('preserves multi-element arrays', () => {
      const hit = {
        _index: 'logs-osquery',
        _id: '1',
        fields: {
          tags: ['a', 'b'],
        },
        _source: {},
      };
      const result = flattenOsqueryHit(hit as unknown as ResultEdges[number]);
      expect(result.tags).toEqual(['a', 'b']);
    });

    it('resolves agent.name from _source when not in fields', () => {
      const hit = {
        _index: 'logs-osquery',
        _id: '1',
        fields: {},
        _source: { agent: { name: 'source-agent', id: 'agent-id-1' } },
      };
      const result = flattenOsqueryHit(hit as unknown as ResultEdges[number]);
      expect(result['agent.name']).toBe('source-agent');
      expect(result['agent.id']).toBe('agent-id-1');
    });

    it('does not override agent.name from fields with _source', () => {
      const hit = {
        _index: 'logs-osquery',
        _id: '1',
        fields: { 'agent.name': ['field-agent'] },
        _source: { agent: { name: 'source-agent' } },
      };
      const result = flattenOsqueryHit(hit as unknown as ResultEdges[number]);
      expect(result['agent.name']).toBe('field-agent');
    });

    it('handles missing fields and _source gracefully', () => {
      const hit = { _index: 'logs-osquery', _id: '1' };
      const result = flattenOsqueryHit(hit as unknown as ResultEdges[number]);
      expect(result).toEqual({});
    });

    it('flattens ECS mapping fields from _source', () => {
      const hit = {
        _index: 'logs-osquery',
        _id: '1',
        fields: {},
        _source: { process: { name: 'chrome' } },
      };
      const ecsMapping = { 'process.name': { field: 'name' } };
      const result = flattenOsqueryHit(hit as unknown as ResultEdges[number], ecsMapping as any);
      expect(result['process.name']).toBe('chrome');
    });

    it('stringifies array ECS mapping values', () => {
      const hit = {
        _index: 'logs-osquery',
        _id: '1',
        fields: {},
        _source: { 'host.ip': ['10.0.0.1', '10.0.0.2'] },
      };
      const ecsMapping = { 'host.ip': { field: 'ip' } };
      const result = flattenOsqueryHit(hit as unknown as ResultEdges[number], ecsMapping as any);
      expect(result['host.ip']).toContain('10.0.0.1');
      expect(result['host.ip']).toContain('10.0.0.2');
    });
  });

  describe('transformEdgesToRecords', () => {
    it('converts edges to DataTableRecord format', () => {
      const edges = [
        {
          _index: 'logs-osquery',
          _id: 'doc-1',
          fields: { 'osquery.name': ['test'] },
          _source: {},
        },
      ] as unknown as ResultEdges;

      const records = transformEdgesToRecords({ edges });
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe('doc-1');
      expect(records[0].flattened['osquery.name']).toBe('test');
      expect(records[0].raw).toBe(edges[0]);
    });

    it('generates fallback ids for missing _id', () => {
      const edges = [
        { _index: 'logs-osquery', fields: {}, _source: {} },
        { _index: 'logs-osquery', fields: {}, _source: {} },
      ] as unknown as ResultEdges;

      const records = transformEdgesToRecords({ edges });
      expect(records[0].id).toBe('osquery-result-0');
      expect(records[1].id).toBe('osquery-result-1');
    });

    it('returns empty array for empty edges', () => {
      expect(transformEdgesToRecords({ edges: [] })).toEqual([]);
    });

    it('passes ecsMapping through to flattenOsqueryHit', () => {
      const edges = [
        {
          _index: 'logs-osquery',
          _id: 'doc-1',
          fields: {},
          _source: { process: { name: 'node' } },
        },
      ] as unknown as ResultEdges;

      const records = transformEdgesToRecords({
        edges,
        ecsMapping: { 'process.name': { field: 'name' } } as any,
      });
      expect(records[0].flattened['process.name']).toBe('node');
    });
  });

  describe('getRecordFieldValue', () => {
    it('returns value from flattened', () => {
      const record = {
        id: 'test::1',
        raw: { _source: {} },
        flattened: { 'osquery.name': 'hostname' },
      } as any;
      expect(getRecordFieldValue(record, 'osquery.name')).toBe('hostname');
    });

    it('returns dash for missing fields', () => {
      const record = {
        id: 'test::1',
        raw: { _source: {} },
        flattened: {},
      } as any;
      expect(getRecordFieldValue(record, 'nonexistent')).toBe('-');
    });

    it('returns dash for empty string', () => {
      const record = {
        id: 'test::1',
        raw: { _source: {} },
        flattened: { 'osquery.name': '' },
      } as any;
      expect(getRecordFieldValue(record, 'osquery.name')).toBe('-');
    });

    it('returns dash for null', () => {
      const record = {
        id: 'test::1',
        raw: { _source: {} },
        flattened: { 'osquery.name': null },
      } as any;
      expect(getRecordFieldValue(record, 'osquery.name')).toBe('-');
    });
  });
});
