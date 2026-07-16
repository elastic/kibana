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

const createDiscovery = (overrides: StoredRow): Discovery =>
  ({
    kind: 'discovery',
    discovery_id: overrides.discovery_id ?? 'discovery-1',
    discovery_slug: overrides.discovery_slug ?? 'svc__rule',
    rule_names: [],
    stream_names: [],
    title: 'Test discovery',
    summary: 'Test summary',
    root_cause: 'Test root cause',
    criticality: 50,
    confidence: 0.8,
    detections: [],
    ...overrides,
  } as Discovery);

const sourceResponse = (docs: Discovery[]): ESQLSearchResponse =>
  ({
    columns: [{ name: '_source', type: 'object' }],
    values: docs.map((d) => [d]),
  } as unknown as ESQLSearchResponse);

const countResponse = (total: number): ESQLSearchResponse =>
  ({
    columns: [{ name: 'total', type: 'long' }],
    values: [[total]],
  } as unknown as ESQLSearchResponse);

// Mirrors the slug-keyed processed derivation: one row per processed discovery_slug.
const processedResponse = (slugs: string[]): ESQLSearchResponse =>
  ({
    columns: [{ name: 'discovery_slug', type: 'keyword' }],
    values: slugs.map((s) => [s]),
  } as unknown as ESQLSearchResponse);

interface MockResponses {
  // Latest discovery per group, as returned by the data query (already collapsed by groupBy).
  discoveries: Discovery[];
  // Slugs the processed derivation reports as processed.
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
        documents: [discovery],
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

  describe('findStateBySlug', () => {
    it('returns the complete non-handled state history', async () => {
      const state = createDiscovery({
        '@timestamp': '2026-01-02T00:00:00.000Z',
        discovery_slug: 'svc__rule',
      });
      const { client, query } = createClient({
        discoveries: [state],
        processedSlugs: [],
      });

      const result = await client.findStateBySlug('svc__rule');

      expect(result.hits).toEqual([state]);
      expect(query).toHaveBeenCalledTimes(1);
      const request = query.mock.calls[0][0] as { query: string };
      expect(request.query).toContain('kind != "handled"');
      expect(request.query).toContain('SORT @timestamp ASC');
      expect(request.query).not.toContain('LIMIT');
    });
  });

  describe('findLatestPaginated', () => {
    it('collapses two discoveries sharing one slug (different ids) into a single hit', async () => {
      // The data query already collapses by groupBy; with slug grouping only the
      // latest discovery per slug is returned.
      const latest = createDiscovery({
        '@timestamp': '2026-01-02T00:00:00.000Z',
        discovery_id: 'exec-2-svc__rule',
        discovery_slug: 'svc__rule',
      });
      const { client } = createClient({ discoveries: [latest], processedSlugs: [] });

      const result = await client.findLatestPaginated();

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].discovery_slug).toBe('svc__rule');
      expect(result.hits[0].kind).toBe('discovery');
    });

    it('groups by discovery_slug, not discovery_id', async () => {
      const { client, query } = createClient({
        discoveries: [createDiscovery({ '@timestamp': '2026-01-02T00:00:00.000Z' })],
        processedSlugs: [],
      });

      await client.findLatestPaginated();

      const dataQuery = query.mock.calls
        .map((c) => (c[0] as { query: string }).query)
        .find((q) => !q.includes('STATS total') && !q.includes('unified_id'));
      expect(dataQuery).toContain('discovery_slug');
      expect(dataQuery).not.toContain('BY discovery_id');
    });

    it('keeps distinct slugs as separate hits', async () => {
      const { client } = createClient({
        discoveries: [
          createDiscovery({ '@timestamp': '2026-01-02T00:00:00.000Z', discovery_slug: 'svc__a' }),
          createDiscovery({ '@timestamp': '2026-01-02T00:00:00.000Z', discovery_slug: 'svc__b' }),
        ],
        processedSlugs: [],
      });

      const result = await client.findLatestPaginated();

      expect(result.hits.map((h) => h.discovery_slug).sort()).toEqual(['svc__a', 'svc__b']);
    });

    it('marks a slug as processed when a handled doc is at least as recent as the latest discovery', async () => {
      const discovery = createDiscovery({
        '@timestamp': '2026-01-01T00:00:00.000Z',
        discovery_slug: 'svc__rule',
      });
      const { client } = createClient({ discoveries: [discovery], processedSlugs: ['svc__rule'] });

      const result = await client.findLatestPaginated();

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].processed).toBe(true);
    });

    it('does not mark a slug processed when a newer discovery (regrow) follows the handled doc', async () => {
      // discovery(old) -> handled(old) -> discovery(new) for the same slug.
      // The timestamp guard means the slug is NOT reported processed, so the newest
      // discovery stays visible.
      const regrown = createDiscovery({
        '@timestamp': '2026-01-03T00:00:00.000Z',
        discovery_id: 'exec-3-svc__rule',
        discovery_slug: 'svc__rule',
      });
      const { client } = createClient({ discoveries: [regrown], processedSlugs: [] });

      const result = await client.findLatestPaginated();

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].kind).toBe('discovery');
    });
  });

  describe('getProcessedSlugs (via findLatestPaginated)', () => {
    it('keys the processed derivation on discovery_slug', async () => {
      const discovery = createDiscovery({
        '@timestamp': '2026-01-01T00:00:00.000Z',
        discovery_id: 'exec-1-svc__rule',
        discovery_slug: 'svc__rule',
      });
      const { client, query } = createClient({
        discoveries: [discovery],
        processedSlugs: ['svc__rule'],
      });

      await client.findLatestPaginated();

      const clearanceQuery = query.mock.calls
        .map((c) => (c[0] as { query: string }).query)
        .find((q) => q.includes('max_state_ts'));
      expect(clearanceQuery).toContain('discovery_slug');
    });
  });
});
