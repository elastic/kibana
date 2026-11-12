/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { dataStreamService, datasetQualityPrivileges } from '../../../services';

import { getDataStreams } from '.';

const mockGetMockMatchingDataStreams = jest.fn().mockImplementation(() => MATCHING_DATA_STREAMS);
const mockGetMockDataStreamPrivileges = jest.fn().mockImplementation(() => DATA_STREAMS_PRIVILEGES);

describe('getDataStreams', () => {
  beforeAll(() => {
    // Mock dataStreamService
    jest
      .spyOn(dataStreamService, 'getMatchingDataStreams')
      .mockImplementation(mockGetMockMatchingDataStreams);
    jest
      .spyOn(datasetQualityPrivileges, 'getHasIndexPrivileges')
      .mockImplementation(mockGetMockDataStreamPrivileges);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Passes the correct parameters to the DataStreamService', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    const result = await getDataStreams({
      esClient: esClientMock,
      types: ['logs', 'metrics'],
      uncategorisedOnly: true,
      isSecurityEnabled: true,
    });
    expect(dataStreamService.getMatchingDataStreams).toHaveBeenCalledWith(
      expect.anything(),
      'logs-*-*,metrics-*-*'
    );
    expect(datasetQualityPrivileges.getHasIndexPrivileges).toHaveBeenCalledWith(
      esClientMock,
      ['logs-test.test-default'],
      ['read', 'monitor', 'read_failure_store', 'manage_failure_store'],
      true
    );
    expect(result.dataStreams[0].userPrivileges.canMonitor).toBe(true);
  });

  it('Passes datasetQuery parameter to the DataStreamService', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    await getDataStreams({
      esClient: esClientMock,
      datasetQuery: 'logs-nginx-*',
      uncategorisedOnly: true,
      isSecurityEnabled: true,
    });
    expect(dataStreamService.getMatchingDataStreams).toHaveBeenCalledWith(
      expect.anything(),
      'logs-nginx-*'
    );
  });

  describe('uncategorized only option', () => {
    it('Returns the correct number of results when true', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      const results = await getDataStreams({
        esClient: esClientMock,
        types: ['logs'],
        uncategorisedOnly: true,
        isSecurityEnabled: true,
      });
      expect(results.dataStreams.length).toBe(1);
    });
    it('Returns the correct number of results when false', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      const results = await getDataStreams({
        esClient: esClientMock,
        types: ['logs'],
        uncategorisedOnly: false,
        isSecurityEnabled: true,
      });
      expect(results.dataStreams.length).toBe(5);
    });
  });

  it('excludes data streams that the user can neither read nor monitor', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    const inaccessibleDataStream = MATCHING_DATA_STREAMS[0].name;
    mockGetMockDataStreamPrivileges.mockImplementationOnce(() => ({
      ...DATA_STREAMS_PRIVILEGES,
      [inaccessibleDataStream]: {
        read: false,
        monitor: false,
        read_failure_store: false,
        manage_failure_store: false,
      },
    }));

    const result = await getDataStreams({
      esClient: esClientMock,
      types: ['logs'],
      isSecurityEnabled: true,
    });

    expect(result.dataStreams.map(({ name }) => name)).not.toContain(inaccessibleDataStream);
  });
});

const MATCHING_DATA_STREAMS = [
  {
    name: 'logs-elastic_agent-default',
    timestamp_field: { name: '@timestamp' },
    indices: [
      {
        index_name: '.ds-logs-elastic_agent-default-2023.05.17-000001',
        index_uuid: 'EcqQR36PTNCKVnfAftq_Rw',
      },
    ],
    generation: 1,
    _meta: { managed_by: 'fleet', managed: true, package: { name: 'elastic_agent' } },
    status: 'YELLOW',
    template: 'logs-elastic_agent',
    ilm_policy: 'logs',
    hidden: false,
    system: false,
    allow_custom_routing: false,
    replicated: false,
  },
  {
    name: 'logs-elastic_agent.filebeat-default',
    timestamp_field: { name: '@timestamp' },
    indices: [
      {
        index_name: '.ds-logs-elastic_agent.filebeat-default-2023.05.17-000001',
        index_uuid: 'v5uEn55TRrurU3Bf4CBtzw',
      },
    ],
    generation: 1,
    _meta: { managed_by: 'fleet', managed: true, package: { name: 'elastic_agent' } },
    status: 'YELLOW',
    template: 'logs-elastic_agent.filebeat',
    ilm_policy: 'logs',
    hidden: false,
    system: false,
    allow_custom_routing: false,
    replicated: false,
  },
  {
    name: 'logs-elastic_agent.fleet_server-default',
    timestamp_field: { name: '@timestamp' },
    indices: [
      {
        index_name: '.ds-logs-elastic_agent.fleet_server-default-2023.05.17-000001',
        index_uuid: 'nThe6dkaQnagAlyNsAyYsA',
      },
    ],
    generation: 1,
    _meta: { managed_by: 'fleet', managed: true, package: { name: 'elastic_agent' } },
    status: 'YELLOW',
    template: 'logs-elastic_agent.fleet_server',
    ilm_policy: 'logs',
    hidden: false,
    system: false,
    allow_custom_routing: false,
    replicated: false,
  },
  {
    name: 'logs-elastic_agent.metricbeat-default',
    timestamp_field: { name: '@timestamp' },
    indices: [
      {
        index_name: '.ds-logs-elastic_agent.metricbeat-default-2023.05.17-000001',
        index_uuid: 'Y5vQ7V6-QSSMM-CPdqOkCg',
      },
    ],
    generation: 1,
    _meta: { managed_by: 'fleet', managed: true, package: { name: 'elastic_agent' } },
    status: 'YELLOW',
    template: 'logs-elastic_agent.metricbeat',
    ilm_policy: 'logs',
    hidden: false,
    system: false,
    allow_custom_routing: false,
    replicated: false,
  },
  {
    name: 'logs-test.test-default',
    timestamp_field: { name: '@timestamp' },
    indices: [
      {
        index_name: '.ds-logs-elastic_agent.metricbeat-default-2023.05.17-000001',
        index_uuid: 'Y5vQ7V6-QSSMM-CPdqOkCg',
      },
    ],
  },
];

const DATA_STREAMS_PRIVILEGES = Object.values(MATCHING_DATA_STREAMS).reduce((acc, stream) => {
  acc[stream.name] = {
    read: true,
    monitor: true,
    read_failure_store: true,
    manage_failure_store: true,
  };

  return acc;
}, {} as Record<string, Record<string, boolean>>);
