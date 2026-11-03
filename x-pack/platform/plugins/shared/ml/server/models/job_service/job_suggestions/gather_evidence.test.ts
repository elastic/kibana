/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { gatherEvidence } from './gather_evidence';

const caps = (type: string, aggregatable = true) => ({ [type]: { type, aggregatable } });

const fieldCapsResponse = {
  fields: {
    '@timestamp': caps('date'),
    'event.created': caps('date'),
    'host.name': caps('keyword'),
    'source.ip': caps('ip'),
    bytes: caps('long'),
    message: caps('text', false),
    'client.geo': caps('geo_point'),
    conflicted: {
      keyword: { type: 'keyword', aggregatable: true },
      long: { type: 'long', aggregatable: true },
    },
    _index: caps('_index'),
    'some.object': caps('object', false),
  },
};

const searchResponse = (overrides: Record<string, unknown> = {}) => ({
  hits: {
    total: { value: 1000 },
    hits: [{ _source: { host: { name: 'web-01' }, message: 'x'.repeat(500) } }],
  },
  aggregations: {
    coverage: { buckets: [{ doc_count: 5 }, { doc_count: 0 }, { doc_count: 3 }, { doc_count: 0 }] },
    card_0: { value: 12 },
    top_0: { buckets: [{ key: 'web-01' }, { key: 'web-02' }] },
    card_1: { value: 300 },
    stats_0: { count: 750, min: 1, max: 9, avg: 4.5 },
  },
  ...overrides,
});

const createClient = (
  fieldCaps: unknown = fieldCapsResponse,
  search: unknown = searchResponse()
) => {
  const asCurrentUser = {
    fieldCaps: jest.fn().mockResolvedValue(fieldCaps),
    search: jest.fn().mockResolvedValue(search),
  };
  return { client: { asCurrentUser } as unknown as IScopedClusterClient, asCurrentUser };
};

const params = { index: 'logs-*', start: 1_000_000, end: 100_000_000 };

describe('gatherEvidence', () => {
  it('describes the fields of the index', async () => {
    const { client } = createClient();

    const evidence = await gatherEvidence({ client, ...params });

    expect(evidence.timeField).toBe('@timestamp');
    expect(evidence.docCount).toBe(1000);
    expect(evidence.timeRange).toEqual({ start: params.start, end: params.end });
    expect(evidence.fields).toEqual(
      expect.arrayContaining([
        { name: 'host.name', kind: 'keyword', cardinality: 12, topValues: ['web-01', 'web-02'] },
        { name: 'source.ip', kind: 'ip', cardinality: 300 },
        {
          name: 'bytes',
          kind: 'numeric',
          nullRate: 0.25,
          numericStats: { min: 1, max: 9, avg: 4.5 },
        },
        { name: 'message', kind: 'text' },
        { name: 'client.geo', kind: 'geo_point' },
      ])
    );
  });

  it('leaves out fields which cannot be used', async () => {
    const { client } = createClient();

    const { fields } = await gatherEvidence({ client, ...params });

    const names = fields.map(({ name }) => name);
    expect(names).not.toContain('conflicted');
    expect(names).not.toContain('_index');
    expect(names).not.toContain('some.object');
  });

  it('measures how sparse the data is', async () => {
    const { client } = createClient();

    const { emptyBucketFraction } = await gatherEvidence({ client, ...params });

    expect(emptyBucketFraction).toBe(0.5);
  });

  it('only searches the requested time range, as the current user', async () => {
    const { client, asCurrentUser } = createClient();

    await gatherEvidence({ client, ...params });

    expect(asCurrentUser.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'logs-*',
        query: {
          range: { '@timestamp': { gte: params.start, lte: params.end, format: 'epoch_millis' } },
        },
      })
    );
  });

  it('shortens sample documents', async () => {
    const { client } = createClient();

    const { sampleDocs } = await gatherEvidence({ client, ...params });

    expect(sampleDocs).toHaveLength(1);
    expect((sampleDocs[0].message as string).length).toBeLessThan(250);
    expect(sampleDocs[0].host).toEqual({ name: 'web-01' });
  });

  it('prefers @timestamp as the time field, then other date fields', async () => {
    const withoutTimestamp = {
      fields: { 'event.created': caps('date'), 'host.name': caps('keyword') },
    };
    const { client } = createClient(withoutTimestamp);

    const evidence = await gatherEvidence({ client, ...params });

    expect(evidence.timeField).toBe('event.created');
  });

  it('fails when there is no date field', async () => {
    const { client } = createClient({ fields: { 'host.name': caps('keyword') } });

    await expect(gatherEvidence({ client, ...params })).rejects.toMatchObject({
      output: { statusCode: 400 },
    });
  });

  it('fails when there are no documents in the range', async () => {
    const { client } = createClient(
      fieldCapsResponse,
      searchResponse({ hits: { total: { value: 0 }, hits: [] } })
    );

    await expect(gatherEvidence({ client, ...params })).rejects.toMatchObject({
      output: { statusCode: 400 },
    });
  });

  describe('prebuilt modules', () => {
    it('includes the modules which match', async () => {
      const { client } = createClient();
      const modules = [{ id: 'nginx_ecs', title: 'Nginx', description: 'Nginx logs' }];

      const evidence = await gatherEvidence({
        client,
        ...params,
        findRecognizerMatches: jest.fn().mockResolvedValue(modules),
      });

      expect(evidence.recognizerModules).toEqual(modules);
    });

    it('carries on when finding modules fails', async () => {
      const { client } = createClient();

      const evidence = await gatherEvidence({
        client,
        ...params,
        findRecognizerMatches: jest.fn().mockRejectedValue(new Error('no saved objects')),
      });

      expect(evidence.recognizerModules).toEqual([]);
    });
  });
});
