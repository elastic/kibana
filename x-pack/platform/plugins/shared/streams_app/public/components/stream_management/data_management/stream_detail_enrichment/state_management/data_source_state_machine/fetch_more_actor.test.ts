/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SampleDocument } from '@kbn/streams-schema';
import {
  findConditionById,
  deduplicateDocuments,
  buildKqlWhereClause,
  extractRawDocumentsFromSource,
} from './fetch_more_actor';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { EnrichmentDataSourceWithUIAttributes } from '../../types';

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

  describe('deduplicateDocuments', () => {
    it('returns all documents when there are no duplicate _ids', () => {
      const existing: SampleDocument[] = [
        { _id: 'id-1', '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
      ];
      const newDocs: SampleDocument[] = [
        { _id: 'id-2', '@timestamp': '2025-01-01T00:02:00.000Z', message: 'doc2' },
      ];

      const result = deduplicateDocuments(existing, newDocs);
      expect(result).toHaveLength(2);
      expect(result).toEqual([...existing, ...newDocs]);
    });

    it('removes documents whose _id already exists in the existing set', () => {
      const existing: SampleDocument[] = [
        { _id: 'id-1', '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
        { _id: 'id-2', '@timestamp': '2025-01-01T00:02:00.000Z', message: 'doc2' },
      ];
      const newDocs: SampleDocument[] = [
        { _id: 'id-1', '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
        { _id: 'id-3', '@timestamp': '2025-01-01T00:03:00.000Z', message: 'doc3' },
      ];

      const result = deduplicateDocuments(existing, newDocs);
      expect(result).toHaveLength(3);
      expect(result[0]._id).toBe('id-1');
      expect(result[1]._id).toBe('id-2');
      expect(result[2]._id).toBe('id-3');
    });

    it('returns only existing docs when all new docs are duplicates', () => {
      const existing: SampleDocument[] = [
        { _id: 'id-1', '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
      ];
      const newDocs: SampleDocument[] = [
        { _id: 'id-1', '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
      ];

      const result = deduplicateDocuments(existing, newDocs);
      expect(result).toHaveLength(1);
      expect(result).toEqual(existing);
    });

    it('handles empty existing documents', () => {
      const newDocs: SampleDocument[] = [
        { _id: 'id-1', '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
        { _id: 'id-2', '@timestamp': '2025-01-01T00:02:00.000Z', message: 'doc2' },
      ];

      const result = deduplicateDocuments([], newDocs);
      expect(result).toHaveLength(2);
      expect(result).toEqual(newDocs);
    });

    it('handles empty new documents', () => {
      const existing: SampleDocument[] = [
        { _id: 'id-1', '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
      ];

      const result = deduplicateDocuments(existing, []);
      expect(result).toHaveLength(1);
      expect(result).toEqual(existing);
    });

    it('falls back to appending all docs when existing docs have no _id', () => {
      const existing: SampleDocument[] = [
        { '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
      ];
      const newDocs: SampleDocument[] = [
        { '@timestamp': '2025-01-01T00:01:00.000Z', message: 'doc1' },
        { '@timestamp': '2025-01-01T00:02:00.000Z', message: 'doc2' },
      ];

      const result = deduplicateDocuments(existing, newDocs);
      expect(result).toHaveLength(3);
      expect(result).toEqual([...existing, ...newDocs]);
    });
  });

  describe('buildKqlWhereClause', () => {
    const makeKqlDataSource = (
      overrides: Partial<{ query: unknown; filters: unknown[]; timeRange: unknown }>
    ): EnrichmentDataSourceWithUIAttributes =>
      ({
        id: 'ds-1',
        type: 'kql-samples',
        name: 'KQL Source',
        enabled: true,
        query: { language: 'kuery', query: '' },
        ...overrides,
      } as EnrichmentDataSourceWithUIAttributes);

    it('returns empty string for non-kql data sources', () => {
      const ds = {
        id: 'ds-1',
        type: 'latest-samples',
        name: 'Latest',
        enabled: true,
      } as EnrichmentDataSourceWithUIAttributes;
      expect(buildKqlWhereClause(ds)).toBe('');
    });

    it('converts a KQL query into an ES|QL KQL() expression', () => {
      const ds = makeKqlDataSource({
        query: { language: 'kuery', query: 'log.level: error' },
      });
      expect(buildKqlWhereClause(ds)).toBe('KQL("""log.level: error""")');
    });

    it('converts filters into ES|QL expressions', () => {
      const ds = makeKqlDataSource({
        filters: [
          {
            meta: { key: 'service.name', negate: false, disabled: false },
            query: { match_phrase: { 'service.name': 'api-gateway' } },
          },
        ],
      });
      const result = buildKqlWhereClause(ds);
      expect(result).toContain('service.name');
    });

    it('ignores time range to cast a wider net for matching samples', () => {
      const ds = makeKqlDataSource({
        query: { language: 'kuery', query: 'log.level: error' },
        timeRange: { from: '2025-01-01T00:00:00.000Z', to: '2025-01-02T00:00:00.000Z' },
      });
      const result = buildKqlWhereClause(ds);
      expect(result).toBe('KQL("""log.level: error""")');
      expect(result).not.toContain('@timestamp');
    });

    it('returns empty string for empty KQL query with no filters or time range', () => {
      const ds = makeKqlDataSource({});
      expect(buildKqlWhereClause(ds)).toBe('');
    });
  });

  describe('extractRawDocumentsFromSource', () => {
    it('extracts flattened _source as the document, preserving _id', () => {
      const docs: SampleDocument[] = [
        {
          _id: 'doc-1',
          _source: { message: 'hello world', '@timestamp': '2025-01-01T00:00:00.000Z' },
          extracted_field: 'this was added by processing',
          message: 'hello world',
          '@timestamp': '2025-01-01T00:00:00.000Z',
        },
      ];

      const result = extractRawDocumentsFromSource(docs);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        _id: 'doc-1',
        message: 'hello world',
        '@timestamp': '2025-01-01T00:00:00.000Z',
      });
      expect(result[0]).not.toHaveProperty('extracted_field');
      expect(result[0]).not.toHaveProperty('_source');
    });

    it('flattens nested _source objects', () => {
      const docs: SampleDocument[] = [
        {
          _id: 'doc-1',
          _source: {
            message: 'test',
            log: { level: 'error' },
          },
          message: 'test',
          'log.level': 'error',
          extracted: 'from processing',
        },
      ];

      const result = extractRawDocumentsFromSource(docs);
      expect(result[0]).toEqual({
        _id: 'doc-1',
        message: 'test',
        'log.level': 'error',
      });
    });

    it('returns original doc when _source is missing', () => {
      const docs: SampleDocument[] = [{ _id: 'doc-1', message: 'no source here' }];

      const result = extractRawDocumentsFromSource(docs);
      expect(result[0]).toEqual({ _id: 'doc-1', message: 'no source here' });
    });

    it('works without _id', () => {
      const docs: SampleDocument[] = [
        {
          _source: { message: 'hello' },
          message: 'hello',
          processed_field: 'should be discarded',
        },
      ];

      const result = extractRawDocumentsFromSource(docs);
      expect(result[0]).toEqual({ message: 'hello' });
      expect(result[0]).not.toHaveProperty('_id');
      expect(result[0]).not.toHaveProperty('processed_field');
    });
  });
});
