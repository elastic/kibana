/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { ALWAYS_CONDITION } from '@kbn/streamlang';
import type { SampleDocument } from '@kbn/streams-schema';
import {
  buildFetchMoreEsqlQuery,
  findConditionById,
  getDocumentId,
} from './simulation_state_machine';

const makeAction = (
  id: string,
  parentId: StreamlangStepWithUIAttributes['parentId'] = null
): StreamlangStepWithUIAttributes =>
  ({
    customIdentifier: id,
    parentId,
    action: 'set',
    from: 'foo',
    to: 'bar',
    where: ALWAYS_CONDITION,
  } as StreamlangStepWithUIAttributes);

const makeConditionBlock = (
  id: string,
  condition: object,
  parentId: StreamlangStepWithUIAttributes['parentId'] = null
): StreamlangStepWithUIAttributes =>
  ({
    customIdentifier: id,
    parentId,
    condition: {
      ...condition,
      steps: [],
    },
  } as unknown as StreamlangStepWithUIAttributes);

describe('Simulation state machine helpers', () => {
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

  describe('findConditionById', () => {
    const steps: StreamlangStepWithUIAttributes[] = [
      makeAction('p1'),
      makeConditionBlock('c1', { field: 'level', eq: 'error' }),
      makeAction('p2', 'c1'),
      makeConditionBlock('c2', { field: 'service', contains: 'api' }, 'c1'),
      makeAction('p3', 'c2'),
      makeAction('p4'),
    ];

    it('finds a condition by its id', () => {
      const condition = findConditionById(steps, 'c1');
      expect(condition).toEqual({ field: 'level', eq: 'error' });
    });

    it('finds a nested condition by its id', () => {
      const condition = findConditionById(steps, 'c2');
      expect(condition).toEqual({ field: 'service', contains: 'api' });
    });

    it('returns undefined when condition id is not found', () => {
      const condition = findConditionById(steps, 'nonexistent');
      expect(condition).toBeUndefined();
    });

    it('returns undefined for empty steps', () => {
      const condition = findConditionById([], 'c1');
      expect(condition).toBeUndefined();
    });

    it('does not return action steps as conditions', () => {
      const condition = findConditionById(steps, 'p1');
      expect(condition).toBeUndefined();
    });

    it('excludes nested steps from the returned condition', () => {
      const stepsWithNestedContent: StreamlangStepWithUIAttributes[] = [
        {
          customIdentifier: 'c1',
          parentId: null,
          condition: {
            field: 'level',
            eq: 'error',
            steps: [{ action: 'set', from: 'a', to: 'b' }],
          },
        } as unknown as StreamlangStepWithUIAttributes,
      ];
      const condition = findConditionById(stepsWithNestedContent, 'c1');
      expect(condition).toEqual({ field: 'level', eq: 'error' });
      expect(condition).not.toHaveProperty('steps');
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
