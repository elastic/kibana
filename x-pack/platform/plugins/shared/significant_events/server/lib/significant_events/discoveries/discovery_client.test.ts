/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { Discovery } from '@kbn/significant-events-schema';
import { BulkCreateOperationError } from '../query_utils';
import { DiscoveryClient } from './discovery_client';

type StoredRow = Partial<Discovery> & { '@timestamp': string };

const createDiscovery = (overrides: StoredRow): Omit<Discovery, 'processed'> =>
  ({
    kind: 'discovery',
    discovery_id: overrides.discovery_id ?? 'discovery-1',
    event_id: overrides.event_id ?? 'svc__rule',
    stream_names: [],
    title: 'Test discovery',
    summary: 'Test summary',
    severity: '40-medium',
    confidence: 0.8,
    signals: [],
    ...overrides,
  } as Discovery);

const sourceResponse = (docs: Omit<Discovery, 'processed'>[]): ESQLSearchResponse =>
  ({
    columns: [{ name: '_source', type: 'object' }],
    values: docs.map((d) => [d]),
  } as unknown as ESQLSearchResponse);

const countResponse = (total: number): ESQLSearchResponse =>
  ({
    columns: [{ name: 'total', type: 'long' }],
    values: [[total]],
  } as unknown as ESQLSearchResponse);

// Mirrors the event_id-keyed processed derivation: one row per processed event_id.
const processedResponse = (eventIds: string[]): ESQLSearchResponse =>
  ({
    columns: [{ name: 'event_id', type: 'keyword' }],
    values: eventIds.map((s) => [s]),
  } as unknown as ESQLSearchResponse);

interface MockResponses {
  // Latest discovery per group, as returned by the data query (already collapsed by groupBy).
  discoveries: Omit<Discovery, 'processed'>[];
  // Event IDs the processed derivation reports as processed.
  processedSlugs: string[];
}

const createClient = (responses: MockResponses) => {
  const query = jest.fn(async (request: { query: string }) => {
    const q = request.query;
    if (q.includes('STATS total')) {
      return countResponse(responses.discoveries.length);
    }
    if (q.includes('max_state_ts')) {
      return processedResponse(responses.processedSlugs);
    }
    return sourceResponse(responses.discoveries);
  });

  const esClient = { esql: { query } } as never;

  return {
    client: new DiscoveryClient({
      dataStreamClient: {} as never,
      esClient,
      space: 'default',
    }),
    query,
  };
};

const createBulkClient = (response: BulkResponse) => {
  const dataStreamClient = {
    create: jest.fn().mockResolvedValue(response),
  };

  return {
    client: new DiscoveryClient({
      dataStreamClient: dataStreamClient as never,
      esClient: {} as never,
      space: 'default',
    }),
    dataStreamClient,
  };
};

describe('DiscoveryClient', () => {
  describe('bulkCreate', () => {
    it('returns bulk responses with errors by default', async () => {
      const response = {
        errors: true,
        items: [{ create: { error: { type: 'mapper_parsing_exception' } } }],
      } as BulkResponse;
      const { client, dataStreamClient } = createBulkClient(response);
      const discovery = createDiscovery({ '@timestamp': '2026-01-01T00:00:00.000Z' });

      await expect(client.bulkCreate([discovery])).resolves.toBe(response);
      expect(dataStreamClient.create).toHaveBeenCalledWith({
        space: 'default',
        documents: [
          expect.objectContaining({
            discovery_id: discovery.discovery_id,
            event_id: discovery.event_id,
            // Canonical discoveries retain sortable severity through the write boundary.
            severity: '40-medium',
          }),
        ],
      });
    });

    it('throws when throwOnFail is enabled and a bulk item has an error', async () => {
      const response = {
        errors: true,
        items: [{ create: { error: { type: 'mapper_parsing_exception' } } }],
      } as BulkResponse;
      const { client } = createBulkClient(response);

      try {
        await client.bulkCreate([createDiscovery({ '@timestamp': '2026-01-01T00:00:00.000Z' })], {
          throwOnFail: true,
        });
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
      const { client } = createBulkClient(response);

      await expect(
        client.bulkCreate([createDiscovery({ '@timestamp': '2026-01-01T00:00:00.000Z' })], {
          throwOnFail: true,
        })
      ).resolves.toBe(response);
    });
  });

  describe('findLatestPaginated', () => {
    it('collapses two discoveries sharing one event_id (different ids) into a single hit', async () => {
      const latest = createDiscovery({
        '@timestamp': '2026-01-02T00:00:00.000Z',
        discovery_id: 'exec-2-svc__rule',
        event_id: 'svc__rule',
      });
      const { client } = createClient({ discoveries: [latest], processedSlugs: [] });

      const result = await client.findLatestPaginated();

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].event_id).toBe('svc__rule');
      expect(result.hits[0].kind).toBe('discovery');
    });

    it('groups by event_id, not discovery_id', async () => {
      const { client, query } = createClient({
        discoveries: [createDiscovery({ '@timestamp': '2026-01-02T00:00:00.000Z' })],
        processedSlugs: [],
      });

      await client.findLatestPaginated();

      const dataQuery = query.mock.calls
        .map((c) => (c[0] as { query: string }).query)
        .find((q) => !q.includes('STATS total') && !q.includes('unified_id'));
      expect(dataQuery).toContain('event_id');
      expect(dataQuery).not.toContain('BY discovery_id');
    });

    it('keeps distinct event_ids as separate hits', async () => {
      const { client } = createClient({
        discoveries: [
          createDiscovery({ '@timestamp': '2026-01-02T00:00:00.000Z', event_id: 'svc__a' }),
          createDiscovery({ '@timestamp': '2026-01-02T00:00:00.000Z', event_id: 'svc__b' }),
        ],
        processedSlugs: [],
      });

      const result = await client.findLatestPaginated();

      expect(result.hits.map((h) => h.event_id).sort()).toEqual(['svc__a', 'svc__b']);
    });

    it('marks an event_id as processed when a handled doc is at least as recent as the latest discovery', async () => {
      const discovery = createDiscovery({
        '@timestamp': '2026-01-01T00:00:00.000Z',
        event_id: 'svc__rule',
      });
      const { client } = createClient({ discoveries: [discovery], processedSlugs: ['svc__rule'] });

      const result = await client.findLatestPaginated();

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].processed).toBe(true);
    });

    it('does not mark an event_id processed when a newer discovery (regrow) follows the handled doc', async () => {
      const regrown = createDiscovery({
        '@timestamp': '2026-01-03T00:00:00.000Z',
        discovery_id: 'exec-3-svc__rule',
        event_id: 'svc__rule',
      });
      const { client } = createClient({ discoveries: [regrown], processedSlugs: [] });

      const result = await client.findLatestPaginated();

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].kind).toBe('discovery');
    });
  });

  describe('getProcessedEventIds (via findLatestPaginated)', () => {
    it('keys the processed derivation on event_id', async () => {
      const discovery = createDiscovery({
        '@timestamp': '2026-01-01T00:00:00.000Z',
        discovery_id: 'exec-1-svc__rule',
        event_id: 'svc__rule',
      });
      const { client, query } = createClient({
        discoveries: [discovery],
        processedSlugs: ['svc__rule'],
      });

      await client.findLatestPaginated();

      const processedStateQuery = query.mock.calls
        .map((c) => (c[0] as { query: string }).query)
        .find((q) => q.includes('max_state_ts'));
      expect(processedStateQuery).toContain('event_id');
    });
  });
});
