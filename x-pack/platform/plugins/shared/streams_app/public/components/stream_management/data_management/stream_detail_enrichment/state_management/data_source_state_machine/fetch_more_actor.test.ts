/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SampleDocument } from '@kbn/streams-schema';
import {
  findConditionById,
  buildFetchMoreSearchParams,
  deduplicateDocuments,
} from './fetch_more_actor';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';

describe('fetch_more_actor', () => {
  describe('findConditionById', () => {
    it('returns the condition when a matching condition block is found', () => {
      const steps = [
        {
          customIdentifier: 'cond-1',
          condition: { field: 'log.level', eq: 'info' },
          steps: [],
          parentId: 'parent-1',
        },
      ];
      const result = findConditionById(steps as StreamlangStepWithUIAttributes[], 'cond-1');
      expect(result).toEqual({ field: 'log.level', eq: 'info' });
    });

    it('returns undefined when no matching condition block exists', () => {
      const steps = [
        {
          customIdentifier: 'cond-1',
          condition: { field: 'log.level', eq: 'info' },
          steps: [],
          parentId: 'parent-1',
        },
      ];
      expect(
        findConditionById(steps as StreamlangStepWithUIAttributes[], 'nonexistent')
      ).toBeUndefined();
    });

    it('returns undefined for an empty steps array', () => {
      expect(findConditionById([], 'any-id')).toBeUndefined();
    });

    it('finds condition among multiple steps', () => {
      const steps = [
        {
          customIdentifier: 'cond-1',
          condition: { field: 'log.level', eq: 'info' },
          steps: [],
          parentId: 'parent-1',
        },
        {
          customIdentifier: 'cond-2',
          condition: { field: 'service.name', eq: 'api' },
          steps: [],
          parentId: 'parent-1',
        },
      ];
      const result = findConditionById(steps as StreamlangStepWithUIAttributes[], 'cond-2');
      expect(result).toEqual({ field: 'service.name', eq: 'api' });
    });
  });

  describe('buildFetchMoreSearchParams', () => {
    it('builds correct search params with condition and stream name', () => {
      const result = buildFetchMoreSearchParams(
        'logs.test',
        { field: 'log.level', eq: 'info' },
        {}
      );

      expect(result.index).toBe('logs.test');
      expect(result.size).toBe(100);
      expect(result.track_total_hits).toBe(false);
      expect(result.terminate_after).toBe(100);
      expect(result.allow_partial_search_results).toBe(true);
      expect(result.sort).toEqual([{ '@timestamp': { order: 'desc' } }]);
    });

    it('includes the condition in the query DSL', () => {
      const result = buildFetchMoreSearchParams(
        'logs.test',
        { field: 'log.level', eq: 'info' },
        {}
      );

      expect(result.query.bool.must).toHaveLength(1);
      expect(result.query.bool.must[0]).toBeDefined();
    });

    it('includes runtime_mappings when provided', () => {
      const runtimeMappings = {
        'user.name': { type: 'keyword' as const },
        'response.status': { type: 'double' as const },
      };

      const result = buildFetchMoreSearchParams(
        'logs.test',
        { field: 'user.name', eq: 'user1' },
        runtimeMappings
      );

      expect(result.runtime_mappings).toEqual(runtimeMappings);
    });

    it('passes empty runtime_mappings when none are needed', () => {
      const result = buildFetchMoreSearchParams(
        'logs.test',
        { field: 'log.level', eq: 'info' },
        {}
      );

      expect(result.runtime_mappings).toEqual({});
    });
  });

  describe('deduplicateDocuments', () => {
    it('returns all documents when there are no duplicates', () => {
      const existing: SampleDocument[] = [
        { '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
      ];
      const newDocs: SampleDocument[] = [
        { '@timestamp': '2025-01-01T00:02:00.000Z', message: 'doc2' },
      ];

      const result = deduplicateDocuments(existing, newDocs);
      expect(result).toHaveLength(2);
      expect(result).toEqual([...existing, ...newDocs]);
    });

    it('removes documents that already exist in the existing set', () => {
      const existing: SampleDocument[] = [
        { '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
        { '@timestamp': '2025-01-01T00:02:00.000Z', message: 'doc2' },
      ];
      const newDocs: SampleDocument[] = [
        { '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
        { '@timestamp': '2025-01-01T00:03:00.000Z', message: 'doc3' },
      ];

      const result = deduplicateDocuments(existing, newDocs);
      expect(result).toHaveLength(3);
      expect(result).toEqual([
        { '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
        { '@timestamp': '2025-01-01T00:02:00.000Z', message: 'doc2' },
        { '@timestamp': '2025-01-01T00:03:00.000Z', message: 'doc3' },
      ]);
    });

    it('returns only existing docs when all new docs are duplicates', () => {
      const existing: SampleDocument[] = [
        { '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
      ];
      const newDocs: SampleDocument[] = [
        { '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
      ];

      const result = deduplicateDocuments(existing, newDocs);
      expect(result).toHaveLength(1);
      expect(result).toEqual(existing);
    });

    it('handles empty existing documents', () => {
      const newDocs: SampleDocument[] = [
        { '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
        { '@timestamp': '2025-01-01T00:02:00.000Z', message: 'doc2' },
      ];

      const result = deduplicateDocuments([], newDocs);
      expect(result).toHaveLength(2);
      expect(result).toEqual(newDocs);
    });

    it('handles empty new documents', () => {
      const existing: SampleDocument[] = [
        { '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
      ];

      const result = deduplicateDocuments(existing, []);
      expect(result).toHaveLength(1);
      expect(result).toEqual(existing);
    });

    it('uses deep equality for deduplication', () => {
      const existing: SampleDocument[] = [
        { '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1', nested: { key: 'value' } },
      ];
      const newDocsWithSameContent: SampleDocument[] = [
        { '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1', nested: { key: 'value' } },
      ];
      const newDocsWithDifferentContent: SampleDocument[] = [
        {
          '@timestamp': '2025-01-01T00:01:00.000Z',
          message: 'doc1',
          nested: { key: 'different' },
        },
      ];

      expect(deduplicateDocuments(existing, newDocsWithSameContent)).toHaveLength(1);
      expect(deduplicateDocuments(existing, newDocsWithDifferentContent)).toHaveLength(2);
    });
  });
});
