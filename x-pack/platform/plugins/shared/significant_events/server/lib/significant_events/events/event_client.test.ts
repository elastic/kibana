/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { BulkCreateOperationError } from '../query_utils';
import { EventClient } from './event_client';
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

const sourceResponse = (docs: SignificantEvent[]): ESQLSearchResponse =>
  ({
    columns: [{ name: '_source', type: 'object' }],
    values: docs.map((doc) => [doc]),
  } as unknown as ESQLSearchResponse);

const countResponse = (total: number): ESQLSearchResponse =>
  ({
    columns: [{ name: 'total', type: 'long' }],
    values: [[total]],
  } as unknown as ESQLSearchResponse);

const createSearchClient = ({ hits, total }: { hits: SignificantEvent[]; total: number }) => {
  const query = jest.fn(async (request: { query: string }) => {
    const { query: q } = request;
    if (q.includes('STATS total')) {
      return countResponse(total);
    }
    return sourceResponse(hits);
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
  describe('bulkCreate', () => {
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
  });
});
