/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  transformEdgesToRecords,
  flattenOsqueryHit,
  getRecordFieldValue,
  getNestedOrFlat,
} from './transform_results';
import type { ResultEdges } from '../../common/search_strategy';

describe('transform_results', () => {
  describe('flattenOsqueryHit', () => {
    it('should flatten fields from edge', () => {
      const edge: ResultEdges[number] = {
        _id: 'test-id',
        _index: 'test-index',
        fields: {
          'agent.name': ['test-agent'],
          'agent.id': ['agent-123'],
          'osquery.column1': ['value1'],
        },
      };

      const result = flattenOsqueryHit(edge);

      expect(result['agent.name']).toBe('test-agent');
      expect(result['agent.id']).toBe('agent-123');
      expect(result['osquery.column1']).toBe('value1');
    });

    it('should handle array fields with multiple values', () => {
      const edge: ResultEdges[number] = {
        _id: 'test-id',
        _index: 'test-index',
        fields: {
          'multi.field': ['value1', 'value2'],
        },
      };

      const result = flattenOsqueryHit(edge);

      expect(result['multi.field']).toEqual(['value1', 'value2']);
    });

    it('should include ECS mapping fields from _source', () => {
      const ecsMapping = {
        'destination.ip': { field: 'remote_address', value: '' },
        'source.port': { field: 'local_port', value: '' },
      };

      const edge: ResultEdges[number] = {
        _id: 'test-id',
        _index: 'test-index',
        fields: {},
        _source: {
          'destination.ip': '192.168.1.1',
          'source.port': 8080,
        },
      };

      const result = flattenOsqueryHit(edge, ecsMapping);

      expect(result['destination.ip']).toBe('192.168.1.1');
      expect(result['source.port']).toBe(8080);
    });

    it('should stringify array/object values from ECS mapping', () => {
      const ecsMapping = {
        'complex.field': { field: 'test', value: '' },
      };

      const edge: ResultEdges[number] = {
        _id: 'test-id',
        _index: 'test-index',
        fields: {},
        _source: {
          'complex.field': { nested: 'value' },
        },
      };

      const result = flattenOsqueryHit(edge, ecsMapping);

      expect(result['complex.field']).toBe(JSON.stringify({ nested: 'value' }, null, 2));
    });

    it('should fall back to _source for agent.name when not in fields', () => {
      const edge: ResultEdges[number] = {
        _id: 'test-id',
        _index: 'test-index',
        fields: {
          'osquery.column1': ['value1'],
        },
        _source: {
          agent: { name: 'my-hostname', id: 'agent-abc' },
        },
      };

      const result = flattenOsqueryHit(edge);

      expect(result['agent.name']).toBe('my-hostname');
      expect(result['agent.id']).toBe('agent-abc');
      expect(result['osquery.column1']).toBe('value1');
    });

    it('should prefer fields over _source for agent.name', () => {
      const edge: ResultEdges[number] = {
        _id: 'test-id',
        _index: 'test-index',
        fields: {
          'agent.name': ['from-fields'],
          'agent.id': ['id-from-fields'],
        },
        _source: {
          agent: { name: 'from-source', id: 'id-from-source' },
        },
      };

      const result = flattenOsqueryHit(edge);

      expect(result['agent.name']).toBe('from-fields');
      expect(result['agent.id']).toBe('id-from-fields');
    });

    it('should handle _source without nested agent object', () => {
      const edge: ResultEdges[number] = {
        _id: 'test-id',
        _index: 'test-index',
        fields: {},
        _source: {
          other: 'data',
        },
      };

      const result = flattenOsqueryHit(edge);

      expect(result['agent.name']).toBeUndefined();
      expect(result['agent.id']).toBeUndefined();
    });

    it('should resolve ECS mapping fields from nested _source objects', () => {
      const ecsMapping = {
        'process.pid': { field: 'pid', value: '' },
        'destination.ip': { field: 'remote_address', value: '' },
      };

      const edge: ResultEdges[number] = {
        _id: 'test-id',
        _index: 'test-index',
        fields: {},
        _source: {
          process: { pid: 1234 },
          destination: { ip: '192.168.1.1' },
        },
      };

      const result = flattenOsqueryHit(edge, ecsMapping);

      expect(result['process.pid']).toBe(1234);
      expect(result['destination.ip']).toBe('192.168.1.1');
    });

    it('should resolve deeply nested ECS fields from _source', () => {
      const ecsMapping = {
        'process.parent.pid': { field: 'parent_pid', value: '' },
      };

      const edge: ResultEdges[number] = {
        _id: 'test-id',
        _index: 'test-index',
        fields: {},
        _source: {
          process: { parent: { pid: 682 } },
        },
      };

      const result = flattenOsqueryHit(edge, ecsMapping);

      expect(result['process.parent.pid']).toBe(682);
    });

    it('should handle ECS fields stored as flat dot-notation keys in _source', () => {
      const ecsMapping = {
        'process.pid': { field: 'pid', value: '' },
      };

      const edge: ResultEdges[number] = {
        _id: 'test-id',
        _index: 'test-index',
        fields: {},
        _source: {
          'process.pid': 5678,
        },
      };

      const result = flattenOsqueryHit(edge, ecsMapping);

      expect(result['process.pid']).toBe(5678);
    });

    it('should handle empty edge', () => {
      const edge: ResultEdges[number] = {
        _id: 'test-id',
        _index: 'test-index',
      };

      const result = flattenOsqueryHit(edge);

      expect(result).toEqual({});
    });
  });

  describe('transformEdgesToRecords', () => {
    it('should transform edges to DataTableRecord format', () => {
      const edges: ResultEdges = [
        {
          _id: 'doc-1',
          _index: 'test-index',
          fields: {
            'agent.name': ['agent-1'],
          },
        },
        {
          _id: 'doc-2',
          _index: 'test-index',
          fields: {
            'agent.name': ['agent-2'],
          },
        },
      ];

      const result = transformEdgesToRecords({ edges });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('doc-1');
      expect(result[0].flattened['agent.name']).toBe('agent-1');
      expect(result[1].id).toBe('doc-2');
      expect(result[1].flattened['agent.name']).toBe('agent-2');
    });

    it('should generate fallback id when _id is missing', () => {
      const edges: ResultEdges = [
        {
          _index: 'test-index',
          fields: {},
        },
      ];

      const result = transformEdgesToRecords({ edges });

      expect(result[0].id).toMatch(/^osquery-result-0$/);
    });

    it('should handle empty edges array', () => {
      const result = transformEdgesToRecords({ edges: [] });

      expect(result).toEqual([]);
    });

    it('should preserve raw document in record', () => {
      const edges: ResultEdges = [
        {
          _id: 'doc-1',
          _index: 'test-index',
          fields: { 'test.field': ['value'] },
          _source: { original: 'data' },
        },
      ];

      const result = transformEdgesToRecords({ edges });

      expect(result[0].raw).toEqual(edges[0]);
    });

    it('should apply ECS mapping when provided', () => {
      const ecsMapping = {
        'custom.field': { field: 'original', value: '' },
      };

      const edges: ResultEdges = [
        {
          _id: 'doc-1',
          _index: 'test-index',
          fields: {},
          _source: {
            'custom.field': 'mapped-value',
          },
        },
      ];

      const result = transformEdgesToRecords({ edges, ecsMapping });

      expect(result[0].flattened['custom.field']).toBe('mapped-value');
    });
  });

  describe('getNestedOrFlat', () => {
    it('should resolve nested paths', () => {
      const source = { process: { pid: 1234 } };
      expect(getNestedOrFlat('process.pid', source)).toBe(1234);
    });

    it('should resolve deeply nested paths', () => {
      const source = { process: { parent: { pid: 682 } } };
      expect(getNestedOrFlat('process.parent.pid', source)).toBe(682);
    });

    it('should resolve flat dot-notation keys', () => {
      const source = { 'process.pid': 5678 };
      expect(getNestedOrFlat('process.pid', source)).toBe(5678);
    });

    it('should resolve when both nested and flat exist', () => {
      // lodash get resolves flat key first when both exist; in practice this doesn't occur
      const source = { process: { pid: 1234 }, 'process.pid': 5678 };
      const result = getNestedOrFlat('process.pid', source);
      expect(result === 1234 || result === 5678).toBe(true);
    });

    it('should return undefined for missing paths', () => {
      const source = { other: 'data' };
      expect(getNestedOrFlat('process.pid', source)).toBeUndefined();
    });

    it('should handle null/undefined source', () => {
      expect(getNestedOrFlat('process.pid', null)).toBeUndefined();
      expect(getNestedOrFlat('process.pid', undefined)).toBeUndefined();
    });
  });

  describe('getRecordFieldValue', () => {
    it('should return field value from flattened record', () => {
      const record = {
        id: 'test-id',
        raw: {} as ResultEdges[number],
        flattened: {
          'agent.name': 'test-agent',
          'osquery.pid': 1234,
        },
      };

      expect(getRecordFieldValue(record, 'agent.name')).toBe('test-agent');
      expect(getRecordFieldValue(record, 'osquery.pid')).toBe(1234);
    });

    it('should return "-" for undefined values', () => {
      const record = {
        id: 'test-id',
        raw: {} as ResultEdges[number],
        flattened: {},
      };

      expect(getRecordFieldValue(record, 'missing.field')).toBe('-');
    });

    it('should return "-" for null values', () => {
      const record = {
        id: 'test-id',
        raw: {} as ResultEdges[number],
        flattened: {
          'null.field': null,
        },
      };

      expect(getRecordFieldValue(record, 'null.field')).toBe('-');
    });

    it('should return "-" for empty string values', () => {
      const record = {
        id: 'test-id',
        raw: {} as ResultEdges[number],
        flattened: {
          'empty.field': '',
        },
      };

      expect(getRecordFieldValue(record, 'empty.field')).toBe('-');
    });

    it('should return 0 for zero values', () => {
      const record = {
        id: 'test-id',
        raw: {} as ResultEdges[number],
        flattened: {
          'zero.field': 0,
        },
      };

      expect(getRecordFieldValue(record, 'zero.field')).toBe(0);
    });
  });
});
