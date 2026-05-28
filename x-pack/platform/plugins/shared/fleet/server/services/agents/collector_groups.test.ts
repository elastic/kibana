/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { getCollectorGroups } from './collector_groups';

jest.mock('./build_status_runtime_field', () => ({
  buildAgentStatusRuntimeField: jest.fn().mockResolvedValue({}),
}));

jest.mock('./crud', () => {
  const actual = jest.requireActual('./crud');
  return {
    ACTIVE_AGENT_CONDITION: actual.ACTIVE_AGENT_CONDITION,
    ENROLLED_AGENT_CONDITION: actual.ENROLLED_AGENT_CONDITION,
    _joinFilters: jest.fn((filters: string[]) => {
      const joined = filters.filter(Boolean).join(' AND ');
      return joined ? { type: 'mock', query: joined } : undefined;
    }),
    getSpaceAwarenessFilterForAgents: jest.fn().mockImplementation(() => Promise.resolve([])),
    includeUnenrolled: actual.includeUnenrolled,
  };
});

const createMockEsClient = (response: any) =>
  ({
    search: jest.fn().mockResolvedValue(response),
  } as unknown as ElasticsearchClient);

const mockSoClient = {} as SavedObjectsClientContract;

describe('getCollectorGroups', () => {
  beforeEach(() => {
    const { _joinFilters } = jest.requireMock('./crud');
    (_joinFilters as jest.Mock).mockClear();
  });

  it('returns groups and afterKey when more buckets exist', async () => {
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
            {
              key: { group: 'extra' },
              doc_count: 1,
              group_name: { buckets: [{ key: 'Extra' }] },
              signals: { buckets: [] },
            },
          ],
          after_key: { group: 'extra' },
        },
      },
    });

    const result = await getCollectorGroups(esClient, mockSoClient, {
      groupBy: 'collector.group',
      perPage: 2,
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

  it('suppresses afterKey when fewer buckets than perPage are returned', async () => {
    const esClient = createMockEsClient({
      hits: { hits: [] },
      aggregations: {
        groups: {
          buckets: [
            {
              key: { group: 'web-logs' },
              doc_count: 5,
              group_name: { buckets: [{ key: 'Web Logs' }] },
              signals: { buckets: [{ key: 'logs' }] },
            },
          ],
          after_key: { group: 'web-logs' },
        },
      },
    });

    const result = await getCollectorGroups(esClient, mockSoClient, {
      groupBy: 'collector.group',
      perPage: 20,
    });

    expect(result.items).toHaveLength(1);
    expect(result.afterKey).toBeUndefined();
  });

  it('sets isUngrouped when group key is null', async () => {
    const esClient = createMockEsClient({
      hits: { hits: [] },
      aggregations: {
        groups: {
          buckets: [
            {
              key: { group: null },
              doc_count: 4,
              group_name: { buckets: [] },
              signals: { buckets: [{ key: 'logs' }] },
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
      {
        group: 'others',
        groupDisplayName: 'Others',
        docCount: 4,
        signals: ['logs'],
        isUngrouped: true,
      },
    ]);
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
    expect(searchCall.aggs.groups.composite.size).toBe(11);
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

  describe('showInactive and unenrolled filtering', () => {
    const emptyResponse = {
      hits: { hits: [] },
      aggregations: { groups: { buckets: [] } },
    };

    const getFilters = (mock: jest.Mock) => mock.mock.calls[0][0] as string[];

    it('excludes inactive and unenrolled by default', async () => {
      const esClient = createMockEsClient(emptyResponse);
      const { _joinFilters } = jest.requireMock('./crud');

      await getCollectorGroups(esClient, mockSoClient, {
        groupBy: 'collector.group',
        perPage: 20,
      });

      const filters = getFilters(_joinFilters as jest.Mock);
      expect(filters).toContain('type:OPAMP');
      expect(filters).toContain('NOT (status:inactive)');
      expect(filters).toContain('NOT status:unenrolled');
    });

    it('includes inactive when showInactive is true', async () => {
      const esClient = createMockEsClient(emptyResponse);
      const { _joinFilters } = jest.requireMock('./crud');

      await getCollectorGroups(esClient, mockSoClient, {
        groupBy: 'collector.group',
        perPage: 20,
        showInactive: true,
      });

      const filters = getFilters(_joinFilters as jest.Mock);
      expect(filters).toContain('type:OPAMP');
      expect(filters).not.toContain('NOT (status:inactive)');
      expect(filters).toContain('NOT status:unenrolled');
    });

    it('includes unenrolled when kuery contains status:*', async () => {
      const esClient = createMockEsClient(emptyResponse);
      const { _joinFilters } = jest.requireMock('./crud');

      await getCollectorGroups(esClient, mockSoClient, {
        groupBy: 'collector.group',
        perPage: 20,
        kuery: 'status:*',
      });

      const filters = getFilters(_joinFilters as jest.Mock);
      expect(filters).toContain('type:OPAMP');
      expect(filters).toContain('NOT (status:inactive)');
      expect(filters).not.toContain('NOT status:unenrolled');
    });

    it('includes unenrolled when kuery contains status:unenrolled', async () => {
      const esClient = createMockEsClient(emptyResponse);
      const { _joinFilters } = jest.requireMock('./crud');

      await getCollectorGroups(esClient, mockSoClient, {
        groupBy: 'collector.group',
        perPage: 20,
        kuery: 'status:unenrolled',
      });

      const filters = getFilters(_joinFilters as jest.Mock);
      expect(filters).not.toContain('NOT status:unenrolled');
    });

    it('excludes neither condition when showInactive is true and kuery contains status:*', async () => {
      const esClient = createMockEsClient(emptyResponse);
      const { _joinFilters } = jest.requireMock('./crud');

      await getCollectorGroups(esClient, mockSoClient, {
        groupBy: 'collector.group',
        perPage: 20,
        showInactive: true,
        kuery: 'status:*',
      });

      const filters = getFilters(_joinFilters as jest.Mock);
      expect(filters).toContain('type:OPAMP');
      expect(filters).not.toContain('NOT (status:inactive)');
      expect(filters).not.toContain('NOT status:unenrolled');
    });

    it('always includes the opamp type filter regardless of showInactive', async () => {
      const esClient = createMockEsClient(emptyResponse);
      const { _joinFilters } = jest.requireMock('./crud');

      await getCollectorGroups(esClient, mockSoClient, {
        groupBy: 'collector.group',
        perPage: 20,
        showInactive: true,
        kuery: 'status:*',
      });

      const filters = getFilters(_joinFilters as jest.Mock);
      expect(filters).toContain('type:OPAMP');
    });
  });
});
