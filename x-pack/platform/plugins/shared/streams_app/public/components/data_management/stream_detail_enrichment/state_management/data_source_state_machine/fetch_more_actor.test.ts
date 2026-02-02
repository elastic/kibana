/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALWAYS_CONDITION } from '@kbn/streamlang';
import type { SampleDocument } from '@kbn/streams-schema';
import { buildFetchMoreEsqlQuery, getDocumentId } from './fetch_more_actor';

describe('Fetch more actor helpers', () => {
  describe('getDocumentId', () => {
    it('creates a unique identifier from document content', () => {
      const doc: SampleDocument = {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        message: 'test message',
      };
      const id = getDocumentId(doc);
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('returns the same id for identical documents', () => {
      const doc1: SampleDocument = {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        message: 'test',
      };
      const doc2: SampleDocument = {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        message: 'test',
      };
      expect(getDocumentId(doc1)).toBe(getDocumentId(doc2));
    });

    it('returns different ids for documents with different timestamps', () => {
      const doc1: SampleDocument = {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        message: 'test',
      };
      const doc2: SampleDocument = {
        '@timestamp': '2024-01-02T00:00:00.000Z',
        message: 'test',
      };
      expect(getDocumentId(doc1)).not.toBe(getDocumentId(doc2));
    });

    it('returns different ids for documents with different content', () => {
      const doc1: SampleDocument = {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        message: 'test 1',
      };
      const doc2: SampleDocument = {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        message: 'test 2',
      };
      expect(getDocumentId(doc1)).not.toBe(getDocumentId(doc2));
    });

    it('handles documents without timestamp', () => {
      const doc: SampleDocument = {
        message: 'test message',
      };
      const id = getDocumentId(doc);
      expect(typeof id).toBe('string');
    });
  });

  describe('buildFetchMoreEsqlQuery', () => {
    it('builds an ESQL query with simple equality condition', () => {
      const query = buildFetchMoreEsqlQuery('logs', { field: 'level', eq: 'error' });
      expect(query).toContain('FROM logs METADATA _id');
      expect(query).toContain('WHERE');
      expect(query).toContain('KEEP _id');
      expect(query).toContain('LIMIT 100');
    });

    it('builds an ESQL query with contains condition', () => {
      const query = buildFetchMoreEsqlQuery('my-stream', { field: 'message', contains: 'error' });
      expect(query).toContain('FROM my-stream METADATA _id');
      expect(query).toContain('WHERE');
      expect(query).toContain('KEEP _id');
      expect(query).toContain('LIMIT 100');
    });

    it('builds an ESQL query with numeric comparison', () => {
      const query = buildFetchMoreEsqlQuery('metrics', { field: 'cpu_usage', gt: 80 });
      expect(query).toContain('FROM metrics METADATA _id');
      expect(query).toContain('WHERE');
      expect(query).toContain('KEEP _id');
      expect(query).toContain('LIMIT 100');
    });

    it('uses the correct stream name in the FROM clause', () => {
      const query = buildFetchMoreEsqlQuery('my-custom-stream', { field: 'status', eq: 200 });
      expect(query).toMatch(/^FROM my-custom-stream METADATA _id/);
    });

    it('builds query for always condition', () => {
      const query = buildFetchMoreEsqlQuery('logs', ALWAYS_CONDITION);
      expect(query).toContain('FROM logs METADATA _id');
      expect(query).toContain('WHERE');
      expect(query).toContain('KEEP _id');
    });
  });
});
