/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { datasetQualityPrivileges } from '../../../services';
import { createDatasetQualityESClient } from '../../../utils';
import { getFailedDocsPaginated } from '../failed_docs/get_failed_docs';
import { getDataStreams } from '../get_data_streams';
import { getDataStreamsMeteringStats } from '../get_data_streams_metering_stats';
import { getDataStreamDetails } from '.';

jest.mock('../../../services');
jest.mock('../../../utils');
jest.mock('../failed_docs/get_failed_docs');
jest.mock('../get_data_streams');
jest.mock('../get_data_streams_metering_stats');

const mockDatasetQualityPrivileges = datasetQualityPrivileges as jest.Mocked<
  typeof datasetQualityPrivileges
>;
const mockCreateDatasetQualityESClient = createDatasetQualityESClient as jest.MockedFunction<
  typeof createDatasetQualityESClient
>;
const mockGetFailedDocsPaginated = getFailedDocsPaginated as jest.MockedFunction<
  typeof getFailedDocsPaginated
>;
const mockGetDataStreams = getDataStreams as jest.MockedFunction<typeof getDataStreams>;
const mockGetDataStreamsMeteringStats = getDataStreamsMeteringStats as jest.MockedFunction<
  typeof getDataStreamsMeteringStats
>;

const detailsObject = {
  docsCount: 1000,
  degradedDocsCount: 50,
  services: { 'service.name': ['service1', 'service2'] },
  hosts: { 'host.name': ['host1', 'host2'] },
  failedDocsCount: 10,
  sizeBytes: 5000,
  hasFailureStore: true,
  lastActivity: 1234567890,
  userPrivileges: {
    canMonitor: true,
    canReadFailureStore: true,
    canManageFailureStore: true,
  },
  customRetentionPeriod: '7d',
  defaultRetentionPeriod: '30d',
};

describe('getDataStreamDetails', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  let mockESClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockDatasetQualityESClient: {
    search: jest.MockedFunction<any>;
  };

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient();
    mockESClient = elasticsearchServiceMock.createElasticsearchClient();
    mockDatasetQualityESClient = {
      search: jest.fn(),
    };
    esClient.asCurrentUser = mockESClient;

    mockCreateDatasetQualityESClient.mockReturnValue(mockDatasetQualityESClient as any);
    mockDatasetQualityPrivileges.getHasIndexPrivileges.mockResolvedValue({
      'logs-test-default': {
        monitor: true,
        read_failure_store: true,
        manage_failure_store: true,
      },
    });
    mockGetDataStreams.mockResolvedValue({
      dataStreams: [
        {
          name: 'logs-test-default',
          hasFailureStore: true,
          lastActivity: 1234567890,
          customRetentionPeriod: '7d',
          defaultRetentionPeriod: '30d',
        },
      ],
      datasetUserPrivileges: { datasetsPrivilages: {} },
    } as any);
    mockGetFailedDocsPaginated.mockResolvedValue([{ count: 10 }] as any);
    mockGetDataStreamsMeteringStats.mockResolvedValue({
      'logs-test-default': {
        totalDocs: 1000,
        sizeBytes: 5000,
      },
    } as any);

    mockDatasetQualityESClient.search.mockResolvedValue({
      aggregations: {
        total_count: { value: 1000 },
        degraded_count: { doc_count: 50 },
        'service.name': {
          buckets: [{ key: 'service1' }, { key: 'service2' }],
        },
        'host.name': {
          buckets: [{ key: 'host1' }, { key: 'host2' }],
        },
      },
    });

    mockESClient.indices.stats.mockResolvedValue({
      _all: {
        total: {
          docs: { count: 1000 },
          store: { size_in_bytes: 5000 },
        },
      },
    } as any);

    mockESClient.fieldCaps.mockResolvedValue({
      fields: {
        'host.name': {
          keyword: { type: 'keyword', aggregatable: true },
        },
      },
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parameter validation', () => {
    it('throws badRequest error when dataStream is empty', async () => {
      await expect(
        getDataStreamDetails({
          esClient,
          dataStream: '',
          start: 1234567890,
          end: 1234567890,
          isServerless: false,
        })
      ).rejects.toThrow(badRequest('Data Stream name cannot be empty. Received value ""'));
    });

    it('throws badRequest error when dataStream is undefined', async () => {
      await expect(
        getDataStreamDetails({
          esClient,
          dataStream: undefined as any,
          start: 1234567890,
          end: 1234567890,
          isServerless: false,
        })
      ).rejects.toThrow(badRequest('Data Stream name cannot be empty. Received value "undefined"'));
    });

    describe('successful execution', () => {
      it('returns complete data stream details with all privileges', async () => {
        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-test-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: false,
        });

        expect(result).toEqual(detailsObject);

        expect(mockDatasetQualityPrivileges.getHasIndexPrivileges).toHaveBeenCalledWith(
          esClient.asCurrentUser,
          ['logs-test-default'],
          ['monitor', 'read_failure_store', 'manage_failure_store']
        );
      });

      it('throws when user lacks privileges', async () => {
        mockDatasetQualityPrivileges.getHasIndexPrivileges.mockResolvedValue({
          'logs-test-default': {
            monitor: false,
            read_failure_store: true,
            manage_failure_store: false,
          },
        });

        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-test-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: false,
        });

        expect(mockGetDataStreams).not.toHaveBeenCalled();
        expect(result.sizeBytes).toBe(0);
        expect(result.userPrivileges?.canMonitor).toBe(false);
      });

      it('uses metering stats for serverless', async () => {
        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-test-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: true,
        });

        expect(mockGetDataStreamsMeteringStats).toHaveBeenCalledWith({
          esClient: esClient.asSecondaryAuthUser,
          dataStreams: ['logs-test-default'],
        });
        expect(result).toMatchObject(detailsObject);
      });

      it('uses indices stats for non-serverless', async () => {
        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-test-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: false,
        });

        expect(mockESClient.indices.stats).toHaveBeenCalledWith({
          index: 'logs-test-default',
          forbid_closed_indices: false,
        });
        expect(result).toMatchObject(detailsObject);
      });

      it('calculates average document size correctly when docs count is zero', async () => {
        mockDatasetQualityESClient.search.mockResolvedValue({
          aggregations: {
            total_count: { value: 0 },
            degraded_count: { doc_count: 0 },
          },
        });

        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-test-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: false,
        });

        expect(result.docsCount).toBe(0);
        expect(result.sizeBytes).toBe(0);
      });
    });

    describe('error handling', () => {
      it('returns empty object when data stream does not exist (404 error)', async () => {
        mockDatasetQualityPrivileges.getHasIndexPrivileges.mockResolvedValue({
          'logs-nonexistent-default': {
            monitor: true,
            read_failure_store: true,
            manage_failure_store: true,
          },
        });

        const error = new Error('Not Found');
        (error as any).statusCode = 404;
        mockDatasetQualityESClient.search.mockRejectedValue(error);

        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-nonexistent-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: false,
        });

        expect(result).toEqual({});
      });

      it('returns empty object when index is closed', async () => {
        mockDatasetQualityPrivileges.getHasIndexPrivileges.mockResolvedValue({
          'logs-closed-default': {
            monitor: true,
            read_failure_store: true,
            manage_failure_store: true,
          },
        });

        const error = new Error('Index closed');
        (error as any).body = { error: { type: 'index_closed_exception' } };
        mockDatasetQualityESClient.search.mockRejectedValue(error);

        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-closed-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: false,
        });

        expect(result).toEqual({});
      });

      it('throws error for other types of errors', async () => {
        mockDatasetQualityPrivileges.getHasIndexPrivileges.mockResolvedValue({
          'logs-test-default': {
            monitor: true,
            read_failure_store: true,
            manage_failure_store: true,
          },
        });

        const error = new Error('Internal Server Error');
        (error as any).statusCode = 500;
        mockDatasetQualityESClient.search.mockRejectedValue(error);

        await expect(
          getDataStreamDetails({
            esClient,
            dataStream: 'logs-test-default',
            start: 1234567890,
            end: 1234567900,
            isServerless: false,
          })
        ).rejects.toThrow('Internal Server Error');
      });
    });

    describe('size calculation', () => {
      it('calculates average doc size in bytes for serverless', async () => {
        mockGetDataStreamsMeteringStats.mockResolvedValue({
          'logs-test-default': {
            totalDocs: 20,
            sizeBytes: 30,
          },
        } as any);

        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-test-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: true,
        });

        // avgDocSizeInBytes = 30 / 20 = 1.5
        // sizeBytes = Math.ceil(1.5 * 1000) = 1500
        expect(result.sizeBytes).toBe(1500);
      });

      it('calculates average doc size in bytes for non-serverless', async () => {
        mockESClient.indices.stats.mockResolvedValue({
          _all: {
            total: {
              docs: { count: 20 },
              store: { size_in_bytes: 30 },
            },
          },
        } as any);

        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-test-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: false,
        });

        // avgDocSizeInBytes = 30 / 20 = 1.5
        // sizeBytes = Math.ceil(1.5 * 1000) = 1500
        expect(result.sizeBytes).toBe(1500);
      });
    });
  });
});
