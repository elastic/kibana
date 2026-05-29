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
jest.mock('../../../utils', () => {
  const actual = jest.requireActual('../../../utils');
  return {
    ...actual,
    createDatasetQualityESClient: jest.fn(),
  };
});
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
    search: jest.MockedFunction<ReturnType<typeof createDatasetQualityESClient>['search']>;
    fieldCaps: jest.MockedFunction<ReturnType<typeof createDatasetQualityESClient>['fieldCaps']>;
  };

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient();
    mockESClient = elasticsearchServiceMock.createElasticsearchClient();
    mockDatasetQualityESClient = {
      search: jest.fn(),
      fieldCaps: jest.fn(),
    };
    esClient.asCurrentUser = mockESClient;

    mockCreateDatasetQualityESClient.mockReturnValue(
      mockDatasetQualityESClient as unknown as ReturnType<typeof createDatasetQualityESClient>
    );
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
    } as Awaited<ReturnType<typeof getDataStreams>>);
    mockGetFailedDocsPaginated.mockResolvedValue([{ count: 10 }] as Awaited<
      ReturnType<typeof getFailedDocsPaginated>
    >);
    mockGetDataStreamsMeteringStats.mockResolvedValue({
      'logs-test-default': {
        totalDocs: 1000,
        sizeBytes: 5000,
      },
    } as Awaited<ReturnType<typeof getDataStreamsMeteringStats>>);

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
    } as Awaited<ReturnType<typeof mockESClient.indices.stats>>);

    mockDatasetQualityESClient.fieldCaps.mockResolvedValue({
      fields: {
        'host.name': {
          keyword: { type: 'keyword', aggregatable: true },
        },
        'service.name': {
          keyword: { type: 'keyword', aggregatable: true },
        },
      },
    } as unknown as Awaited<ReturnType<typeof mockDatasetQualityESClient.fieldCaps>>);
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
          isSecurityEnabled: true,
        })
      ).rejects.toThrow(badRequest('Data Stream name cannot be empty. Received value ""'));
    });

    it('throws badRequest error when dataStream is undefined', async () => {
      await expect(
        getDataStreamDetails({
          esClient,
          dataStream: undefined as unknown as string,
          start: 1234567890,
          end: 1234567890,
          isServerless: false,
          isSecurityEnabled: true,
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
          isSecurityEnabled: true,
        });

        expect(result).toEqual(detailsObject);

        expect(mockDatasetQualityPrivileges.getHasIndexPrivileges).toHaveBeenCalledWith(
          esClient.asCurrentUser,
          ['logs-test-default'],
          ['monitor', 'read_failure_store', 'manage_failure_store'],
          true
        );

        expect(mockDatasetQualityESClient.fieldCaps).toHaveBeenCalledWith({
          index: 'logs-test-default',
          fields: ['*'],
          include_unmapped: false,
          index_filter: {
            range: {
              '@timestamp': {
                gte: 1234567890,
                lte: 1234567900,
                format: 'epoch_millis',
              },
            },
          },
        });
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
          isSecurityEnabled: true,
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
          isSecurityEnabled: true,
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
          isSecurityEnabled: true,
        });

        expect(mockESClient.indices.stats).toHaveBeenCalledWith({
          index: 'logs-test-default',
          forbid_closed_indices: false,
        });
        expect(result).toMatchObject(detailsObject);
      });

      it('omits service.name agg when the field is not aggregatable (e.g. text without keyword)', async () => {
        mockDatasetQualityESClient.fieldCaps.mockResolvedValue({
          fields: {
            'host.name': {
              keyword: { type: 'keyword', aggregatable: true },
            },
            'service.name': {
              text: { type: 'text', aggregatable: false },
            },
          },
        } as unknown as Awaited<ReturnType<typeof mockDatasetQualityESClient.fieldCaps>>);

        mockDatasetQualityESClient.search.mockResolvedValue({
          aggregations: {
            total_count: { value: 1000 },
            degraded_count: { doc_count: 50 },
            'host.name': {
              buckets: [{ key: 'host1' }, { key: 'host2' }],
            },
          },
        });

        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-test-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: false,
          isSecurityEnabled: true,
        });

        const searchCall = mockDatasetQualityESClient.search.mock.calls[0][0] as {
          aggs: Record<string, unknown>;
        };
        expect(searchCall.aggs).not.toHaveProperty('service.name');
        expect(result.services).toEqual({});
        expect(result.hosts).toEqual({ 'host.name': ['host1', 'host2'] });
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
          isSecurityEnabled: true,
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
        (error as Error & { statusCode?: number }).statusCode = 404;
        mockDatasetQualityESClient.search.mockRejectedValue(error);

        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-nonexistent-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: false,
          isSecurityEnabled: true,
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
        (error as Error & { body?: { error?: { type?: string } } }).body = {
          error: { type: 'index_closed_exception' },
        };
        mockDatasetQualityESClient.search.mockRejectedValue(error);

        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-closed-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: false,
          isSecurityEnabled: true,
        });

        expect(result).toEqual({});
      });

      it('returns empty object when ES surfaces index_not_found_exception as 500 (e.g. partial-restored backing index)', async () => {
        mockDatasetQualityPrivileges.getHasIndexPrivileges.mockResolvedValue({
          'logs-test-default': {
            monitor: true,
            read_failure_store: true,
            manage_failure_store: true,
          },
        });

        const error = new Error(
          'index_not_found_exception: no such index [partial-.ds-logs-test-default-2026.03.21-000001]'
        );
        (
          error as Error & { statusCode?: number; body?: { error?: { type?: string } } }
        ).statusCode = 500;
        (error as Error & { body?: { error?: { type?: string } } }).body = {
          error: { type: 'index_not_found_exception' },
        };
        mockDatasetQualityESClient.search.mockRejectedValue(error);

        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-test-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: false,
          isSecurityEnabled: true,
        });

        expect(result).toEqual({});
      });

      it('calls the wrapped fieldCaps (not the raw esClient.fieldCaps) so ignore_unavailable is applied', async () => {
        mockDatasetQualityPrivileges.getHasIndexPrivileges.mockResolvedValue({
          'logs-test-default': {
            monitor: true,
            read_failure_store: true,
            manage_failure_store: true,
          },
        });

        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-test-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: false,
          isSecurityEnabled: true,
        });

        expect(mockDatasetQualityESClient.fieldCaps).toHaveBeenCalledWith({
          index: 'logs-test-default',
          fields: ['*'],
          include_unmapped: false,
          index_filter: {
            range: {
              '@timestamp': {
                gte: 1234567890,
                lte: 1234567900,
                format: 'epoch_millis',
              },
            },
          },
        });
        expect(mockESClient.fieldCaps).not.toHaveBeenCalled();
        expect(result).toEqual(detailsObject);
      });

      it('returns docs/services/hosts but sizeBytes=0 when indices.stats throws index_not_found_exception', async () => {
        mockDatasetQualityPrivileges.getHasIndexPrivileges.mockResolvedValue({
          'logs-test-default': {
            monitor: true,
            read_failure_store: true,
            manage_failure_store: true,
          },
        });

        const error = new Error(
          'index_not_found_exception: no such index [partial-.ds-logs-test-default-2026.03.21-000001]'
        );
        (
          error as Error & { statusCode?: number; body?: { error?: { type?: string } } }
        ).statusCode = 500;
        (error as Error & { body?: { error?: { type?: string } } }).body = {
          error: { type: 'index_not_found_exception' },
        };
        mockESClient.indices.stats.mockRejectedValue(error);

        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-test-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: false,
          isSecurityEnabled: true,
        });

        expect(result.docsCount).toBe(1000);
        expect(result.sizeBytes).toBe(0);
        expect(result.services).toEqual({ 'service.name': ['service1', 'service2'] });
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
        (error as Error & { statusCode?: number }).statusCode = 500;
        mockDatasetQualityESClient.search.mockRejectedValue(error);

        await expect(
          getDataStreamDetails({
            esClient,
            dataStream: 'logs-test-default',
            start: 1234567890,
            end: 1234567900,
            isServerless: false,
            isSecurityEnabled: true,
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
        } as Awaited<ReturnType<typeof getDataStreamsMeteringStats>>);

        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-test-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: true,
          isSecurityEnabled: true,
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
        } as Awaited<ReturnType<typeof mockESClient.indices.stats>>);

        const result = await getDataStreamDetails({
          esClient,
          dataStream: 'logs-test-default',
          start: 1234567890,
          end: 1234567900,
          isServerless: false,
          isSecurityEnabled: true,
        });

        // avgDocSizeInBytes = 30 / 20 = 1.5
        // sizeBytes = Math.ceil(1.5 * 1000) = 1500
        expect(result.sizeBytes).toBe(1500);
      });
    });
  });
});
