/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SampleDocument } from '@kbn/streams-schema';
import { findConditionById, deduplicateDocuments } from './fetch_more_actor';
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
});
