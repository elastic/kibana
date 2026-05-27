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
              pipeline_configs: {
                buckets: [
                  { key: 'pipe:logs/access[otlp||es]' },
                  { key: 'pipe:logs/error[otlp||es]' },
                ],
              },
              pipeline_configs_count: { value: 2 },
              first_seen: { value: 1716192000000, value_as_string: '2024-05-20T08:00:00.000Z' },
              last_seen: { value: 1716800000000, value_as_string: '2024-05-27T09:46:40.000Z' },
            },
            {
              key: { group: 'metrics-prod' },
              doc_count: 3,
              group_name: { buckets: [{ key: 'Metrics Production' }] },
              signals: { buckets: [{ key: 'metrics' }] },
              pipeline_configs: { buckets: [{ key: 'pipe:metrics/cpu[otlp||es]' }] },
              pipeline_configs_count: { value: 1 },
              first_seen: { value: 1716300000000, value_as_string: '2024-05-21T14:00:00.000Z' },
              last_seen: { value: 1716790000000, value_as_string: '2024-05-27T06:53:20.000Z' },
            },
            {
              key: { group: 'extra' },
              doc_count: 1,
              group_name: { buckets: [{ key: 'Extra' }] },
              signals: { buckets: [] },
              pipeline_configs: { buckets: [] },
              pipeline_configs_count: { value: 0 },
              first_seen: { value: null },
              last_seen: { value: null },
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
        pipelineConfigs: {
          top: ['pipe:logs/access[otlp||es]', 'pipe:logs/error[otlp||es]'],
          total: 2,
        },
        firstSeen: '2024-05-20T08:00:00.000Z',
        lastSeen: '2024-05-27T09:46:40.000Z',
      },
      {
        group: 'metrics-prod',
        groupDisplayName: 'Metrics Production',
        docCount: 3,
        signals: ['metrics'],
        pipelineConfigs: { top: ['pipe:metrics/cpu[otlp||es]'], total: 1 },
        firstSeen: '2024-05-21T14:00:00.000Z',
        lastSeen: '2024-05-27T06:53:20.000Z',
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
              pipeline_configs: { buckets: [{ key: 'pipe:logs/access[otlp||es]' }] },
              pipeline_configs_count: { value: 1 },
              first_seen: { value: 1716192000000, value_as_string: '2024-05-20T08:00:00.000Z' },
              last_seen: { value: 1716800000000, value_as_string: '2024-05-27T09:46:40.000Z' },
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
              pipeline_configs: { buckets: [{ key: 'pipe:logs/x[otlp||es]' }] },
              pipeline_configs_count: { value: 1 },
              first_seen: { value: 1716192000000, value_as_string: '2024-05-20T08:00:00.000Z' },
              last_seen: { value: 1716800000000, value_as_string: '2024-05-27T09:46:40.000Z' },
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
        pipelineConfigs: { top: ['pipe:logs/x[otlp||es]'], total: 1 },
        firstSeen: '2024-05-20T08:00:00.000Z',
        lastSeen: '2024-05-27T09:46:40.000Z',
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
              pipeline_configs: { buckets: [] },
              pipeline_configs_count: { value: 0 },
              first_seen: { value: null },
              last_seen: { value: null },
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
              pipeline_configs: { buckets: [{ key: 'pipe:logs/access[otlp||es]' }] },
              pipeline_configs_count: { value: 1 },
              first_seen: { value: 1716192000000, value_as_string: '2024-05-20T08:00:00.000Z' },
              last_seen: { value: 1716800000000, value_as_string: '2024-05-27T09:46:40.000Z' },
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
        pipelineConfigs: { top: ['pipe:logs/access[otlp||es]'], total: 1 },
        firstSeen: '2024-05-20T08:00:00.000Z',
        lastSeen: '2024-05-27T09:46:40.000Z',
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

  it('uses pipeline_config runtime field when groupBy is pipeline_config', async () => {
    const esClient = createMockEsClient({
      hits: { hits: [] },
      aggregations: {
        groups: {
          buckets: [
            {
              key: { group: 'pipe:logs/access[otlp||es]' },
              doc_count: 4,
              group_name: { buckets: [{ key: 'pipe:logs/access[otlp||es]' }] },
              signals: { buckets: [{ key: 'logs' }] },
              pipeline_configs: { buckets: [{ key: 'pipe:logs/access[otlp||es]' }] },
              pipeline_configs_count: { value: 1 },
              first_seen: { value: 1716192000000, value_as_string: '2024-05-20T08:00:00.000Z' },
              last_seen: { value: 1716800000000, value_as_string: '2024-05-27T09:46:40.000Z' },
            },
          ],
        },
      },
    });

    const result = await getCollectorGroups(esClient, mockSoClient, {
      groupBy: 'pipeline_config',
      perPage: 20,
    });

    const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
    expect(searchCall.aggs.groups.composite.sources[0].group.terms.field).toBe('pipeline_config');

    expect(result.items).toEqual([
      {
        group: 'pipe:logs/access[otlp||es]',
        groupDisplayName: 'pipe:logs/access[otlp||es]',
        docCount: 4,
        signals: ['logs'],
        pipelineConfigs: { top: ['pipe:logs/access[otlp||es]'], total: 1 },
        firstSeen: '2024-05-20T08:00:00.000Z',
        lastSeen: '2024-05-27T09:46:40.000Z',
      },
    ]);
  });

  it('includes pipeline_config runtime field and sub-aggregations in the ES query', async () => {
    const esClient = createMockEsClient({
      hits: { hits: [] },
      aggregations: { groups: { buckets: [] } },
    });

    await getCollectorGroups(esClient, mockSoClient, {
      groupBy: 'collector.group',
      perPage: 20,
    });

    const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
    expect(searchCall.runtime_mappings).toHaveProperty('pipeline_config');
    expect(searchCall.aggs.groups.aggs.pipeline_configs).toEqual({
      terms: { field: 'pipeline_config', size: 3 },
    });
    expect(searchCall.aggs.groups.aggs.pipeline_configs_count).toEqual({
      cardinality: { field: 'pipeline_config' },
    });
    expect(searchCall.aggs.groups.aggs.first_seen).toEqual({
      min: { field: 'enrolled_at' },
    });
    expect(searchCall.aggs.groups.aggs.last_seen).toEqual({
      max: { field: 'last_checkin' },
    });
  });

  it('omits pipelineConfigs when no pipeline_config data exists', async () => {
    const esClient = createMockEsClient({
      hits: { hits: [] },
      aggregations: {
        groups: {
          buckets: [
            {
              key: { group: 'no-config-group' },
              doc_count: 2,
              group_name: { buckets: [{ key: 'No Config Group' }] },
              signals: { buckets: [] },
              pipeline_configs: { buckets: [] },
              pipeline_configs_count: { value: 0 },
              first_seen: { value: null },
              last_seen: { value: null },
            },
          ],
        },
      },
    });

    const result = await getCollectorGroups(esClient, mockSoClient, {
      groupBy: 'collector.group',
      perPage: 20,
    });

    expect(result.items[0].pipelineConfigs).toBeUndefined();
    expect(result.items[0].firstSeen).toBeUndefined();
    expect(result.items[0].lastSeen).toBeUndefined();
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
