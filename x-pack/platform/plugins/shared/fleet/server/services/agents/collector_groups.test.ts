/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { getCollectorGroups } from './collector_groups';

jest.mock('./crud', () => ({
  _joinFilters: jest.fn((filters: string[]) => {
    const joined = filters.filter(Boolean).join(' AND ');
    return joined ? { type: 'mock', query: joined } : undefined;
  }),
  getSpaceAwarenessFilterForAgents: jest.fn().mockResolvedValue([]),
}));

const createMockEsClient = (response: any) =>
  ({
    search: jest.fn().mockResolvedValue(response),
  } as unknown as ElasticsearchClient);

const mockSoClient = {} as SavedObjectsClientContract;

describe('getCollectorGroups', () => {
  it('returns groups from composite aggregation buckets', async () => {
    const esClient = createMockEsClient({
      hits: { hits: [] },
      aggregations: {
        groups: {
          buckets: [
            {
              key: { group: 'web-logs' },
              doc_count: 5,
              group_name: { buckets: [{ key: 'Web Logs' }] },
              signals: { buckets: [{ key: 'logs' }, { key: 'metrics' }] },
            },
            {
              key: { group: 'metrics-prod' },
              doc_count: 3,
              group_name: { buckets: [{ key: 'Metrics Production' }] },
              signals: { buckets: [{ key: 'metrics' }] },
            },
          ],
          after_key: { group: 'metrics-prod' },
        },
      },
    });

    const result = await getCollectorGroups(esClient, mockSoClient, {
      groupBy: 'collector.group',
      perPage: 20,
    });

    expect(result.items).toEqual([
      {
        group: 'web-logs',
        groupDisplayName: 'Web Logs',
        docCount: 5,
        signals: ['logs', 'metrics'],
      },
      {
        group: 'metrics-prod',
        groupDisplayName: 'Metrics Production',
        docCount: 3,
        signals: ['metrics'],
      },
    ]);
    expect(result.afterKey).toBe(JSON.stringify({ group: 'metrics-prod' }));
  });

  it('falls back to group slug when group_name bucket is empty', async () => {
    const esClient = createMockEsClient({
      hits: { hits: [] },
      aggregations: {
        groups: {
          buckets: [
            {
              key: { group: 'unnamed-group' },
              doc_count: 1,
              group_name: { buckets: [] },
              signals: { buckets: [] },
            },
          ],
        },
      },
    });

    const result = await getCollectorGroups(esClient, mockSoClient, {
      groupBy: 'collector.group',
      perPage: 20,
    });

    expect(result.items).toEqual([
      { group: 'unnamed-group', groupDisplayName: 'unnamed-group', docCount: 1, signals: [] },
    ]);
    expect(result.afterKey).toBeUndefined();
  });

  it('passes afterKey to composite aggregation', async () => {
    const esClient = createMockEsClient({
      hits: { hits: [] },
      aggregations: { groups: { buckets: [] } },
    });

    await getCollectorGroups(esClient, mockSoClient, {
      groupBy: 'collector.group',
      perPage: 10,
      afterKey: { group: 'prev-group' },
    });

    const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
    expect(searchCall.aggs.groups.composite.after).toEqual({ group: 'prev-group' });
    expect(searchCall.aggs.groups.composite.size).toBe(10);
  });

  it('returns empty items when no aggregations', async () => {
    const esClient = createMockEsClient({
      hits: { hits: [] },
    });

    const result = await getCollectorGroups(esClient, mockSoClient, {
      groupBy: 'collector.group',
      perPage: 20,
    });

    expect(result.items).toEqual([]);
    expect(result.afterKey).toBeUndefined();
  });

  it('includes kuery in filters', async () => {
    const esClient = createMockEsClient({
      hits: { hits: [] },
      aggregations: { groups: { buckets: [] } },
    });

    const { _joinFilters } = jest.requireMock('./crud');

    await getCollectorGroups(esClient, mockSoClient, {
      groupBy: 'collector.group',
      perPage: 20,
      kuery: 'tags:production',
    });

    const filters = (_joinFilters as jest.Mock).mock.calls[0][0];
    expect(filters).toContain('type:OPAMP');
    expect(filters).toContain('NOT (status:inactive)');
    expect(filters).toContain('NOT status:unenrolled');
    expect(filters).toContain('tags:production');
  });

  it('uses config.name fields when groupBy is config.name', async () => {
    const esClient = createMockEsClient({
      hits: { hits: [] },
      aggregations: {
        groups: {
          buckets: [
            {
              key: { group: 'webserver-logs' },
              doc_count: 2,
              group_name: { buckets: [{ key: 'Webserver access and error logs' }] },
              signals: { buckets: [{ key: 'logs' }] },
            },
          ],
        },
      },
    });

    const result = await getCollectorGroups(esClient, mockSoClient, {
      groupBy: 'config.name',
      perPage: 20,
    });

    const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
    expect(searchCall.aggs.groups.composite.sources[0].group.terms.field).toBe(
      'non_identifying_attributes.config.name'
    );
    expect(searchCall.aggs.groups.aggs.group_name.terms.field).toBe(
      'non_identifying_attributes.config.description'
    );

    expect(result.items).toEqual([
      {
        group: 'webserver-logs',
        groupDisplayName: 'Webserver access and error logs',
        docCount: 2,
        signals: ['logs'],
      },
    ]);
  });

  it('uses collector.group fields when groupBy is collector.group', async () => {
    const esClient = createMockEsClient({
      hits: { hits: [] },
      aggregations: { groups: { buckets: [] } },
    });

    await getCollectorGroups(esClient, mockSoClient, {
      groupBy: 'collector.group',
      perPage: 20,
    });

    const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
    expect(searchCall.aggs.groups.composite.sources[0].group.terms.field).toBe(
      'non_identifying_attributes.elastic.collector.group'
    );
    expect(searchCall.aggs.groups.aggs.group_name.terms.field).toBe(
      'non_identifying_attributes.elastic.collector.group_name'
    );
  });
});
