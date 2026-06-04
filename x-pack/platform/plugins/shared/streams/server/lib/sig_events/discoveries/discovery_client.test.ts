/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { Discovery } from '@kbn/streams-schema';
import { DiscoveryClient } from './discovery_client';

type StoredRow = Partial<Discovery> & { '@timestamp': string };

const createFinding = (overrides: StoredRow): Discovery =>
  ({
    kind: 'finding',
    discovery_id: overrides.discovery_id ?? 'discovery-1',
    discovery_slug: overrides.discovery_slug ?? 'svc__rule',
    rule_names: [],
    stream_names: [],
    title: 'Test discovery',
    summary: 'Test summary',
    root_cause: 'Test root cause',
    criticality: 50,
    confidence: 0.8,
    impact: 'medium',
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

// Mirrors the slug-keyed clearance derivation: one row per cleared `unified_id` (slug).
const clearedResponse = (slugs: string[]): ESQLSearchResponse =>
  ({
    columns: [{ name: 'unified_id', type: 'keyword' }],
    values: slugs.map((s) => [s]),
  } as unknown as ESQLSearchResponse);

interface MockResponses {
  // Latest finding per group, as returned by the data query (already collapsed by groupBy).
  findings: Discovery[];
  // Slugs the clearance derivation reports as cleared.
  clearedSlugs: string[];
}

const createClient = (responses: MockResponses) => {
  const query = jest.fn(async (request: { query: string }) => {
    const q = request.query;
    if (q.includes('STATS total')) {
      return countResponse(responses.findings.length);
    }
    if (q.includes('unified_id')) {
      return clearedResponse(responses.clearedSlugs);
    }
    return sourceResponse(responses.findings);
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

describe('DiscoveryClient', () => {
  describe('findLatestPaginated', () => {
    it('collapses two findings sharing one slug (different ids) into a single hit', async () => {
      // The data query already collapses by groupBy; with slug grouping only the
      // latest finding per slug is returned.
      const latest = createFinding({
        '@timestamp': '2026-01-02T00:00:00.000Z',
        discovery_id: 'exec-2-svc__rule',
        discovery_slug: 'svc__rule',
      });
      const { client } = createClient({ findings: [latest], clearedSlugs: [] });

      const result = await client.findLatestPaginated();

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].discovery_slug).toBe('svc__rule');
      expect(result.hits[0].kind).toBe('finding');
    });

    it('groups by discovery_slug, not discovery_id', async () => {
      const { client, query } = createClient({
        findings: [createFinding({ '@timestamp': '2026-01-02T00:00:00.000Z' })],
        clearedSlugs: [],
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
        findings: [
          createFinding({ '@timestamp': '2026-01-02T00:00:00.000Z', discovery_slug: 'svc__a' }),
          createFinding({ '@timestamp': '2026-01-02T00:00:00.000Z', discovery_slug: 'svc__b' }),
        ],
        clearedSlugs: [],
      });

      const result = await client.findLatestPaginated();

      expect(result.hits.map((h) => h.discovery_slug).sort()).toEqual(['svc__a', 'svc__b']);
    });

    it('marks a slug as cleared when a clearance is at least as recent as the latest finding', async () => {
      const finding = createFinding({
        '@timestamp': '2026-01-01T00:00:00.000Z',
        discovery_slug: 'svc__rule',
      });
      const { client } = createClient({ findings: [finding], clearedSlugs: ['svc__rule'] });

      const result = await client.findLatestPaginated();

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].kind).toBe('clearance');
    });

    it('does not clear a slug when a newer finding (regrow) follows the clearance', async () => {
      // finding(old) -> clearance(old) -> finding(new) for the same slug.
      // The timestamp guard means the slug is NOT reported cleared, so the newest
      // finding stays visible.
      const regrown = createFinding({
        '@timestamp': '2026-01-03T00:00:00.000Z',
        discovery_id: 'exec-3-svc__rule',
        discovery_slug: 'svc__rule',
      });
      const { client } = createClient({ findings: [regrown], clearedSlugs: [] });

      const result = await client.findLatestPaginated();

      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].kind).toBe('finding');
    });
  });

  describe('getClearedSlugs (via findLatestPaginated)', () => {
    it('keys the clearance derivation on discovery_slug', async () => {
      const finding = createFinding({
        '@timestamp': '2026-01-01T00:00:00.000Z',
        discovery_id: 'exec-1-svc__rule',
        discovery_slug: 'svc__rule',
      });
      const { client, query } = createClient({
        findings: [finding],
        clearedSlugs: ['svc__rule'],
      });

      await client.findLatestPaginated();

      const clearanceQuery = query.mock.calls
        .map((c) => (c[0] as { query: string }).query)
        .find((q) => q.includes('unified_id'));
      expect(clearanceQuery).toContain('discovery_slug');
    });
  });
});
