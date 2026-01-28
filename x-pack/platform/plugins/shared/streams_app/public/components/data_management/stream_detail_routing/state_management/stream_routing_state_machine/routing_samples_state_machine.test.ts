/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import type { SampleDocument } from '@kbn/streams-schema';
import { buildFetchMoreEsqlQuery } from './routing_samples_state_machine';

describe('routing_samples_state_machine', () => {
  describe('buildFetchMoreEsqlQuery', () => {
    it('should build a basic ESQL query with a simple eq condition', () => {
      const streamName = 'logs';
      const condition: Condition = { field: 'status', eq: 'active' };

      const result = buildFetchMoreEsqlQuery(streamName, condition);

      expect(result).toBe(
        'FROM logs METADATA _id | WHERE status == "active" | KEEP _id | LIMIT 100'
      );
    });

    it('should build query with numeric gt condition', () => {
      const streamName = 'metrics';
      const condition: Condition = { field: 'count', gt: 100 };

      const result = buildFetchMoreEsqlQuery(streamName, condition);

      expect(result).toBe('FROM metrics METADATA _id | WHERE count > 100 | KEEP _id | LIMIT 100');
    });

    it('should build query with nested field name', () => {
      const streamName = 'logs.app';
      const condition: Condition = { field: 'user.name', eq: 'test' };

      const result = buildFetchMoreEsqlQuery(streamName, condition);

      expect(result).toBe(
        'FROM logs.app METADATA _id | WHERE `user.name` == "test" | KEEP _id | LIMIT 100'
      );
    });

    it('should build query with AND condition', () => {
      const streamName = 'logs';
      const condition: Condition = {
        and: [
          { field: 'status', eq: 'active' },
          { field: 'count', gt: 10 },
        ],
      };

      const result = buildFetchMoreEsqlQuery(streamName, condition);

      expect(result).toBe(
        'FROM logs METADATA _id | WHERE status == "active" AND count > 10 | KEEP _id | LIMIT 100'
      );
    });

    it('should build query with OR condition', () => {
      const streamName = 'logs';
      const condition: Condition = {
        or: [
          { field: 'level', eq: 'error' },
          { field: 'level', eq: 'critical' },
        ],
      };

      const result = buildFetchMoreEsqlQuery(streamName, condition);

      expect(result).toBe(
        'FROM logs METADATA _id | WHERE level == "error" OR level == "critical" | KEEP _id | LIMIT 100'
      );
    });

    it('should build query with NOT condition', () => {
      const streamName = 'logs';
      const condition: Condition = {
        not: { field: 'status', eq: 'inactive' },
      };

      const result = buildFetchMoreEsqlQuery(streamName, condition);

      expect(result).toBe(
        'FROM logs METADATA _id | WHERE NOT status == "inactive" | KEEP _id | LIMIT 100'
      );
    });

    it('should build query with exists condition', () => {
      const streamName = 'logs';
      const condition: Condition = { field: 'error.message', exists: true };

      const result = buildFetchMoreEsqlQuery(streamName, condition);

      expect(result).toBe(
        'FROM logs METADATA _id | WHERE NOT(`error.message` IS NULL) | KEEP _id | LIMIT 100'
      );
    });

    it('should build query with contains condition', () => {
      const streamName = 'logs';
      const condition: Condition = { field: 'message', contains: 'error' };

      const result = buildFetchMoreEsqlQuery(streamName, condition);

      expect(result).toBe(
        'FROM logs METADATA _id | WHERE CONTAINS(TO_LOWER(message), "error") | KEEP _id | LIMIT 100'
      );
    });

    it('should build query with complex nested condition', () => {
      const streamName = 'logs';
      const condition: Condition = {
        and: [
          { field: 'active', eq: true },
          {
            or: [
              { field: 'role', eq: 'admin' },
              { field: 'role', eq: 'moderator' },
            ],
          },
        ],
      };

      const result = buildFetchMoreEsqlQuery(streamName, condition);

      expect(result).toBe(
        'FROM logs METADATA _id | WHERE active == TRUE AND (role == "admin" OR role == "moderator") | KEEP _id | LIMIT 100'
      );
    });

    it('should build query with always condition', () => {
      const streamName = 'logs';
      const condition: Condition = { always: {} };

      const result = buildFetchMoreEsqlQuery(streamName, condition);

      expect(result).toBe('FROM logs METADATA _id | WHERE TRUE | KEEP _id | LIMIT 100');
    });

    it('should handle boolean values correctly', () => {
      const streamName = 'logs';
      const condition: Condition = { field: 'enabled', eq: false };

      const result = buildFetchMoreEsqlQuery(streamName, condition);

      expect(result).toBe('FROM logs METADATA _id | WHERE enabled == FALSE | KEEP _id | LIMIT 100');
    });

    it('should handle decimal values correctly', () => {
      const streamName = 'metrics';
      const condition: Condition = { field: 'latency', gte: 0.5 };

      const result = buildFetchMoreEsqlQuery(streamName, condition);

      expect(result).toBe(
        'FROM metrics METADATA _id | WHERE latency >= 0.5 | KEEP _id | LIMIT 100'
      );
    });
  });

  describe('document deduplication logic', () => {
    // Testing the deduplication logic used in appendDocuments action
    const createDocumentKey = (doc: SampleDocument): string => {
      return JSON.stringify(doc['@timestamp']) + JSON.stringify(doc);
    };

    const deduplicateDocuments = (
      existingDocs: SampleDocument[],
      newDocs: SampleDocument[]
    ): SampleDocument[] => {
      const existingIds = new Set(existingDocs.map(createDocumentKey));
      const uniqueNewDocs = newDocs.filter((doc) => !existingIds.has(createDocumentKey(doc)));
      return [...existingDocs, ...uniqueNewDocs];
    };

    it('should not add duplicate documents', () => {
      const existingDocs: SampleDocument[] = [
        { '@timestamp': '2024-01-01T00:00:00Z', message: 'test1' },
        { '@timestamp': '2024-01-01T00:00:01Z', message: 'test2' },
      ];
      const newDocs: SampleDocument[] = [
        { '@timestamp': '2024-01-01T00:00:00Z', message: 'test1' }, // Duplicate
        { '@timestamp': '2024-01-01T00:00:02Z', message: 'test3' }, // New
      ];

      const result = deduplicateDocuments(existingDocs, newDocs);

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        { '@timestamp': '2024-01-01T00:00:00Z', message: 'test1' },
        { '@timestamp': '2024-01-01T00:00:01Z', message: 'test2' },
        { '@timestamp': '2024-01-01T00:00:02Z', message: 'test3' },
      ]);
    });

    it('should add all new documents when no duplicates', () => {
      const existingDocs: SampleDocument[] = [
        { '@timestamp': '2024-01-01T00:00:00Z', message: 'test1' },
      ];
      const newDocs: SampleDocument[] = [
        { '@timestamp': '2024-01-01T00:00:01Z', message: 'test2' },
        { '@timestamp': '2024-01-01T00:00:02Z', message: 'test3' },
      ];

      const result = deduplicateDocuments(existingDocs, newDocs);

      expect(result).toHaveLength(3);
    });

    it('should return existing documents when all new docs are duplicates', () => {
      const existingDocs: SampleDocument[] = [
        { '@timestamp': '2024-01-01T00:00:00Z', message: 'test1' },
        { '@timestamp': '2024-01-01T00:00:01Z', message: 'test2' },
      ];
      const newDocs: SampleDocument[] = [
        { '@timestamp': '2024-01-01T00:00:00Z', message: 'test1' },
        { '@timestamp': '2024-01-01T00:00:01Z', message: 'test2' },
      ];

      const result = deduplicateDocuments(existingDocs, newDocs);

      expect(result).toHaveLength(2);
      expect(result).toEqual(existingDocs);
    });

    it('should handle empty existing documents', () => {
      const existingDocs: SampleDocument[] = [];
      const newDocs: SampleDocument[] = [
        { '@timestamp': '2024-01-01T00:00:00Z', message: 'test1' },
        { '@timestamp': '2024-01-01T00:00:01Z', message: 'test2' },
      ];

      const result = deduplicateDocuments(existingDocs, newDocs);

      expect(result).toHaveLength(2);
      expect(result).toEqual(newDocs);
    });

    it('should handle empty new documents', () => {
      const existingDocs: SampleDocument[] = [
        { '@timestamp': '2024-01-01T00:00:00Z', message: 'test1' },
      ];
      const newDocs: SampleDocument[] = [];

      const result = deduplicateDocuments(existingDocs, newDocs);

      expect(result).toHaveLength(1);
      expect(result).toEqual(existingDocs);
    });

    it('should differentiate documents with same timestamp but different content', () => {
      const existingDocs: SampleDocument[] = [
        { '@timestamp': '2024-01-01T00:00:00Z', message: 'test1', level: 'info' },
      ];
      const newDocs: SampleDocument[] = [
        { '@timestamp': '2024-01-01T00:00:00Z', message: 'test1', level: 'error' }, // Same timestamp, different level
      ];

      const result = deduplicateDocuments(existingDocs, newDocs);

      expect(result).toHaveLength(2);
    });

    it('should handle documents with nested fields', () => {
      const existingDocs: SampleDocument[] = [
        { '@timestamp': '2024-01-01T00:00:00Z', user: { name: 'Alice', id: 1 } },
      ];
      const newDocs: SampleDocument[] = [
        { '@timestamp': '2024-01-01T00:00:00Z', user: { name: 'Alice', id: 1 } }, // Duplicate
        { '@timestamp': '2024-01-01T00:00:00Z', user: { name: 'Bob', id: 2 } }, // New
      ];

      const result = deduplicateDocuments(existingDocs, newDocs);

      expect(result).toHaveLength(2);
    });
  });
});
