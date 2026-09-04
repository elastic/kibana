/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ESQLSearchResponse } from '@kbn/es-types';
import {
  MAX_ASSESSMENT_NOTE_LENGTH,
  MAX_SIGNAL_DESCRIPTION_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_SYMPTOM_HYPOTHESIS_LENGTH,
} from '@kbn/significant-events-schema';
import { BulkCreateOperationError } from '../query_utils';
import { EventClient, normalizeLegacyVerdict } from './event_client';
import { storedEventSchema, type SignificantEvent } from './data_stream';

const createEvent = (): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_uuid: 'event-1',
  event_id: 'agent-event-1',
  status: 'open',
  stream_names: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  severity: '40-medium',
  confidence: 0.8,
});

const createClient = (response: BulkResponse) => {
  const dataStreamClient = {
    create: jest.fn().mockResolvedValue(response),
  };

  return {
    client: new EventClient({
      dataStreamClient: dataStreamClient as never,
      esClient: {} as never,
      space: 'default',
    }),
    dataStreamClient,
  };
};

const sourceResponse = (docs: SignificantEvent[], createdAt?: string): ESQLSearchResponse =>
  ({
    columns: [
      { name: '_source', type: 'object' },
      ...(createdAt === undefined ? [] : [{ name: 'created_at', type: 'date' }]),
    ],
    values: docs.map((doc) => [doc, ...(createdAt === undefined ? [] : [createdAt])]),
  } as unknown as ESQLSearchResponse);

const countResponse = (total: number): ESQLSearchResponse =>
  ({
    columns: [{ name: 'total', type: 'long' }],
    values: [[total]],
  } as unknown as ESQLSearchResponse);

const createSearchClient = ({
  hits,
  total,
  createdAt,
}: {
  hits: SignificantEvent[];
  total: number;
  createdAt?: string;
}) => {
  const query = jest.fn(async (request: { query: string }) => {
    const { query: q } = request;
    if (q.includes('STATS total')) {
      return countResponse(total);
    }
    return sourceResponse(hits, createdAt);
  });

  return {
    client: new EventClient({
      dataStreamClient: {} as never,
      esClient: { esql: { query } } as never,
      space: 'default',
    }),
    query,
  };
};

describe('EventClient', () => {
  describe('legacy signal verdict normalization', () => {
    it.each([
      [
        { confirmed: true, evidence: { esql_query: 'FROM logs.test', result: 'found' } },
        'confirms',
      ],
      [
        { confirmed: false, evidence: { esql_query: 'FROM logs.test', result: 'found' } },
        'refutes',
      ],
      [{ confirmed: true }, 'not_checked'],
      [{ confirmed: false }, 'not_checked'],
      [{ evidence: null }, 'not_checked'],
      [{ evidence: { esql_query: 'FROM logs.test', result: 'error' } }, 'inconclusive'],
      [
        {
          evidence: { esql_query: 'FROM logs.test', result: 'found' },
        },
        'off_topic',
      ],
    ] as const)('normalizes %o to %s', (legacyFields, verdict) => {
      const signal = normalizeLegacyVerdict({
        type: 'detection',
        stream_name: 'logs.test',
        description: 'Legacy signal',
        metadata: {
          rule_uuid: 'rule-1',
          detection_id: 'detection-1',
          change_point_type: 'spike',
          p_value: 0.01,
        },
        ...legacyFields,
      });

      expect(signal.verdict).toBe(verdict);
      expect(signal).not.toHaveProperty('confirmed');
      expect(signal).not.toHaveProperty('verification');
      const normalizedEvent = { ...createEvent(), signals: [signal] };
      expect(storedEventSchema.safeParse(normalizedEvent).success).toBe(true);
    });
  });

  describe('bulkCreate', () => {
    it('accepts stored narratives that exceed agent input limits (backward compat)', () => {
      const event: SignificantEvent = {
        ...createEvent(),
        symptom_hypothesis: 'x'.repeat(MAX_SYMPTOM_HYPOTHESIS_LENGTH + 1),
        summary: 'x'.repeat(MAX_SUMMARY_LENGTH + 1),
        assessment_note: 'x'.repeat(MAX_ASSESSMENT_NOTE_LENGTH + 1),
        signals: [
          {
            type: 'detection',
            stream_name: 'logs.test',
            description: 'x'.repeat(MAX_SIGNAL_DESCRIPTION_LENGTH + 1),
            verdict: 'not_checked',
            metadata: {
              detection_id: 'detection-1',
              rule_uuid: 'rule-1',
              change_point_type: 'spike',
              p_value: 0.01,
            },
          },
        ],
      };

      expect(storedEventSchema.safeParse(event).success).toBe(true);
    });

    it('returns bulk responses with errors by default', async () => {
      const response = {
        errors: true,
        items: [{ create: { error: { type: 'mapper_parsing_exception' } } }],
      } as BulkResponse;
      const { client, dataStreamClient } = createClient(response);
      const event = createEvent();

      await expect(client.bulkCreate([event])).resolves.toBe(response);
      expect(dataStreamClient.create).toHaveBeenCalledWith({
        space: 'default',
        documents: [storedEventSchema.parse(event)],
        refresh: undefined,
      });
    });

    it('throws when throwOnFail is enabled and a bulk item has an error', async () => {
      const response = {
        errors: true,
        items: [{ create: { error: { type: 'mapper_parsing_exception' } } }],
      } as BulkResponse;
      const { client } = createClient(response);

      try {
        await client.bulkCreate([createEvent()], { throwOnFail: true });
        fail('Expected BulkCreateOperationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BulkCreateOperationError);
        expect((error as BulkCreateOperationError).message).toContain(
          'Bulk create operation failed for 1 out of 1 items'
        );
        expect((error as BulkCreateOperationError).response).toBe(response);
      }
    });

    it('returns the bulk response when throwOnFail is enabled and no items failed', async () => {
      const response = {
        errors: false,
        items: [{ create: { result: 'created' } }],
      } as BulkResponse;
      const { client } = createClient(response);

      await expect(client.bulkCreate([createEvent()], { throwOnFail: true })).resolves.toBe(
        response
      );
    });
  });

  describe('findLatestByCurrentStatePaginated', () => {
    it('filters stable event IDs after latest-state reduction', async () => {
      const { client, query } = createSearchClient({
        hits: [],
        total: 0,
      });

      await client.findLatestByCurrentStatePaginated({
        eventIds: ['checkout-failure', 'payment-failure'],
      });

      const dataQuery = query.mock.calls
        .map((call) => (call[0] as { query: string }).query)
        .find((q) => !q.includes('STATS total'));
      expect(dataQuery).toContain('event_id IN ("checkout-failure", "payment-failure")');
      expect(dataQuery!.indexOf('INLINE STATS latest_ts')).toBeLessThan(
        dataQuery!.indexOf('event_id IN')
      );
    });

    it('returns the lineage creation timestamp before time and current-state filtering', async () => {
      const createdAt = '2026-01-01T00:00:00.000Z';
      const latest = {
        ...createEvent(),
        '@timestamp': '2026-01-03T00:00:00.000Z',
        status: 'closed' as const,
      };
      const { client, query } = createSearchClient({ hits: [latest], total: 1, createdAt });

      const result = await client.findLatestByCurrentStatePaginated({
        from: '2026-01-02T00:00:00.000Z',
        to: '2026-01-04T00:00:00.000Z',
        status: ['closed'],
        stream: ['logs.test'],
      });

      expect(result).toEqual({
        hits: [{ ...latest, created_at: createdAt }],
        page: 1,
        perPage: 25,
        total: 1,
      });

      const dataQuery = query.mock.calls
        .map((call) => (call[0] as { query: string }).query)
        .find((q) => !q.includes('STATS total'));
      expect(dataQuery).toContain('INLINE STATS created_at = MIN(@timestamp) BY event_id');
      expect(dataQuery!.indexOf('INLINE STATS created_at')).toBeLessThan(
        dataQuery!.indexOf('@timestamp >= TO_DATETIME')
      );
      expect(dataQuery!.indexOf('INLINE STATS created_at')).toBeLessThan(
        dataQuery!.indexOf('status IN')
      );
      expect(dataQuery).toContain('SORT @timestamp DESC, _id ASC');
    });

    it('filters open state after latest-per-slug reduction', async () => {
      const { client, query } = createSearchClient({
        hits: [],
        total: 0,
      });

      const result = await client.findLatestByCurrentStatePaginated({ status: ['open'] });

      expect(result.hits).toEqual([]);
      const dataQuery = query.mock.calls
        .map((call) => (call[0] as { query: string }).query)
        .find((q) => !q.includes('STATS total'));
      expect(dataQuery).toContain('status IN');
      expect(dataQuery?.indexOf('INLINE STATS latest_ts')).toBeLessThan(
        dataQuery!.indexOf('status IN')
      );
    });

    it('treats closed as latest status not in open set', async () => {
      const closedLatest = { ...createEvent(), status: 'closed' as const };
      const { client } = createSearchClient({
        hits: [closedLatest],
        total: 1,
      });

      const result = await client.findLatestByCurrentStatePaginated({ status: ['closed'] });

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].status).toBe('closed');
      expect(result.total).toBe(1);
    });

    it('filters severity after latest-per-slug reduction', async () => {
      const { client, query } = createSearchClient({
        hits: [],
        total: 0,
      });

      await client.findLatestByCurrentStatePaginated({
        severity: ['80-critical', '60-high'],
      });

      const dataQuery = query.mock.calls
        .map((call) => (call[0] as { query: string }).query)
        .find((q) => !q.includes('STATS total'));
      expect(dataQuery).toContain('severity IN');
      expect(dataQuery?.indexOf('INLINE STATS latest_ts')).toBeLessThan(
        dataQuery!.indexOf('severity IN')
      );
    });

    it('applies no status filter when no status is provided', async () => {
      const { client, query } = createSearchClient({
        hits: [],
        total: 0,
      });

      await client.findLatestByCurrentStatePaginated({});

      const dataQuery = query.mock.calls
        .map((call) => (call[0] as { query: string }).query)
        .find((q) => !q.includes('STATS total'));
      expect(dataQuery).not.toContain('status');
    });

    it('filters by explicit event ids without a status filter', async () => {
      const { client, query } = createSearchClient({
        hits: [],
        total: 0,
      });

      await client.findLatestByCurrentStatePaginated({ eventIds: ['checkout-failure'] });

      const dataQuery = query.mock.calls
        .map((call) => (call[0] as { query: string }).query)
        .find((q) => !q.includes('STATS total'));
      expect(dataQuery).toContain('event_id IN ("checkout-failure")');
    });

    it('matches a typed search against event_id as well as text fields', async () => {
      const { client, query } = createSearchClient({
        hits: [],
        total: 0,
      });

      await client.findLatestByCurrentStatePaginated({ search: 'checkout-failure' });

      const dataQuery = query.mock.calls
        .map((call) => (call[0] as { query: string }).query)
        .find((q) => !q.includes('STATS total'));
      expect(dataQuery).toContain('TO_LOWER(event_id) == TO_LOWER("checkout-failure")');
    });
  });

  describe('findLatestByCurrentStateBatch', () => {
    it('uses an event ID keyset after latest-state reduction', async () => {
      const event = createEvent();
      const createdAt = '2025-12-31T00:00:00.000Z';
      const { client, query } = createSearchClient({ hits: [event], total: 1, createdAt });

      await expect(
        client.findLatestByCurrentStateBatch({
          status: ['open'],
          afterEventId: 'agent-event-0',
          batchSize: 100,
        })
      ).resolves.toEqual({ hits: [{ ...event, created_at: createdAt }] });

      expect(query).toHaveBeenCalledTimes(1);
      const dataQuery = (query.mock.calls[0][0] as { query: string }).query;
      expect(dataQuery).toContain('event_id > "agent-event-0"');
      expect(dataQuery.indexOf('INLINE STATS latest_ts')).toBeLessThan(
        dataQuery.indexOf('event_id >')
      );
      expect(dataQuery).toContain('SORT event_id ASC');
      expect(dataQuery).toContain('LIMIT 100');
      expect(dataQuery).not.toContain('STATS total');
    });
  });

  describe('findLatestActive', () => {
    it('filters to open status after latest-per-event reduction', async () => {
      const { client, query } = createSearchClient({
        hits: [],
        total: 0,
      });

      await client.findLatestActive({
        from: 'now-24h',
        streamNames: ['logs.checkout'],
        ruleUuids: ['rule-abc'],
      });

      const dataQuery = query.mock.calls
        .map((call) => (call[0] as { query: string }).query)
        .find((q) => !q.includes('STATS total'));
      expect(dataQuery).toContain('status IN ("open")');
      expect(dataQuery?.indexOf('INLINE STATS latest_ts')).toBeLessThan(
        dataQuery!.indexOf('status IN')
      );
    });
  });
});
