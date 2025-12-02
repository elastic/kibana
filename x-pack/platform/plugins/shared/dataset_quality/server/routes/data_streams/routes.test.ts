/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { getDataStreamDetails } from './get_data_stream_details';
import { getDataStreamDefaultRetentionPeriod } from './get_data_streams_default_retention_period';
import { updateFailureStore } from './update_failure_store';
import { dataStreamsRouteRepository } from './routes';
import type { DatasetQualityRouteHandlerResources } from '../types';

const handler =
  dataStreamsRouteRepository['GET /internal/dataset_quality/data_streams/{dataStream}/details']
    .handler;

const updateFailureStoreHandler =
  dataStreamsRouteRepository[
    'PUT /internal/dataset_quality/data_streams/{dataStream}/update_failure_store'
  ].handler;

jest.mock('./get_data_stream_details');
jest.mock('./get_data_streams_default_retention_period');
jest.mock('./update_failure_store');

const mockGetDataStreamDetails = getDataStreamDetails as jest.MockedFunction<
  typeof getDataStreamDetails
>;
const mockGetDataStreamDefaultRetentionPeriod =
  getDataStreamDefaultRetentionPeriod as jest.MockedFunction<
    typeof getDataStreamDefaultRetentionPeriod
  >;
const mockUpdateFailureStore = updateFailureStore as jest.MockedFunction<typeof updateFailureStore>;

describe('dataStreamDetailsRoute', () => {
  let mockResources: DatasetQualityRouteHandlerResources & {
    params: {
      path: { dataStream: string };
      query: { start: number; end: number };
    };
  };
  let mockLogger: ReturnType<typeof loggerMock.create>;
  let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;

  beforeEach(() => {
    mockLogger = loggerMock.create();
    mockRequest = httpServerMock.createKibanaRequest();
    mockEsClient = elasticsearchServiceMock.createScopedClusterClient();

    mockResources = {
      context: {
        core: Promise.resolve({
          elasticsearch: {
            client: mockEsClient,
          },
          savedObjects: {
            client: jest.fn(),
          },
          uiSettings: {
            client: jest.fn(),
          },
        }),
      } as any,
      logger: mockLogger,
      request: mockRequest,
      plugins: {
        fleet: {
          setup: {} as any,
          start: jest.fn().mockResolvedValue({
            packageService: {
              asScoped: jest.fn().mockReturnValue({}),
            },
          }),
        },
      } as any,
      getEsCapabilities: jest.fn(),
      params: {
        path: {
          dataStream: 'logs-test-default',
        },
        query: {
          start: 1234567890,
          end: 1234567900,
        },
      },
    } as any;

    mockGetDataStreamDetails.mockResolvedValue({
      docsCount: 1000,
      degradedDocsCount: 50,
      services: { 'service.name': ['service1', 'service2'] },
      hosts: { 'host.name': ['host1', 'host2'] },
      failedDocsCount: 10,
      sizeBytes: 5000000,
      hasFailureStore: true,
      lastActivity: 1234567890,
      userPrivileges: {
        canMonitor: true,
        canReadFailureStore: true,
        canManageFailureStore: true,
      },
      customRetentionPeriod: '7d',
    });

    mockGetDataStreamDefaultRetentionPeriod.mockResolvedValue('30d');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('non-serverless', () => {
    beforeEach(() => {
      (mockResources.getEsCapabilities as jest.Mock).mockResolvedValue({
        serverless: false,
      });
    });

    it('does not fetch default retention period when already present in details', async () => {
      mockGetDataStreamDetails.mockResolvedValue({
        docsCount: 1000,
        degradedDocsCount: 50,
        services: {},
        hosts: {},
        sizeBytes: 5000000,
        userPrivileges: {
          canMonitor: true,
          canReadFailureStore: true,
          canManageFailureStore: true,
        },
        defaultRetentionPeriod: '14d',
      });

      const result = await handler(mockResources);

      expect(mockGetDataStreamDefaultRetentionPeriod).not.toHaveBeenCalled();
      expect(result.defaultRetentionPeriod).toBe('14d');
    });

    it('fetch default retention period if not present in details', async () => {
      mockGetDataStreamDetails.mockResolvedValue({
        docsCount: 1000,
        degradedDocsCount: 50,
        services: {},
        hosts: {},
        sizeBytes: 5000000,
        userPrivileges: {
          canMonitor: true,
          canReadFailureStore: true,
          canManageFailureStore: true,
        },
      });

      const result = await handler(mockResources);

      expect(mockGetDataStreamDetails).toHaveBeenCalledWith({
        esClient: mockEsClient,
        dataStream: 'logs-test-default',
        start: 1234567890,
        end: 1234567900,
        isServerless: false,
      });

      expect(mockGetDataStreamDefaultRetentionPeriod).toHaveBeenCalledWith({
        esClient: mockEsClient.asCurrentUser,
      });
      expect(result.defaultRetentionPeriod).toBe('30d');
    });

    it('returns undefined default retention period if not available', async () => {
      mockGetDataStreamDetails.mockResolvedValue({
        docsCount: 1000,
        degradedDocsCount: 50,
        services: {},
        hosts: {},
        sizeBytes: 5000000,
        userPrivileges: {
          canMonitor: true,
          canReadFailureStore: true,
          canManageFailureStore: true,
        },
      });
      mockGetDataStreamDefaultRetentionPeriod.mockResolvedValue(undefined);

      const result = await handler(mockResources);

      expect(result.defaultRetentionPeriod).toBe(undefined);
    });

    it('returns empty object when getDataStreamDetails returns empty object', async () => {
      mockGetDataStreamDetails.mockResolvedValue({});

      const result = await handler(mockResources);

      expect(mockGetDataStreamDefaultRetentionPeriod).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('returns empty object when getDataStreamDetails returns null', async () => {
      mockGetDataStreamDetails.mockResolvedValue(null as any);

      const result = await handler(mockResources);

      expect(mockGetDataStreamDefaultRetentionPeriod).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });
  });

  describe('serverless', () => {
    beforeEach(() => {
      (mockResources.getEsCapabilities as jest.Mock).mockResolvedValue({
        serverless: true,
      });
    });

    it('returns retention period when present in details', async () => {
      mockGetDataStreamDetails.mockResolvedValue({
        docsCount: 1000,
        degradedDocsCount: 50,
        services: {},
        hosts: {},
        sizeBytes: 5000000,
        userPrivileges: {
          canMonitor: true,
          canReadFailureStore: true,
          canManageFailureStore: true,
        },
        defaultRetentionPeriod: '14d',
      });

      const result = await handler(mockResources);

      expect(mockGetDataStreamDefaultRetentionPeriod).not.toHaveBeenCalled();

      expect(result.defaultRetentionPeriod).toBe('14d');
    });

    it('returns undefined default retention period if not available in details', async () => {
      mockGetDataStreamDetails.mockResolvedValue({
        docsCount: 1000,
        degradedDocsCount: 50,
        services: {},
        hosts: {},
        sizeBytes: 5000000,
        userPrivileges: {
          canMonitor: true,
          canReadFailureStore: true,
          canManageFailureStore: true,
        },
      });
      const result = await handler(mockResources);

      expect(mockGetDataStreamDefaultRetentionPeriod).not.toHaveBeenCalled();

      expect(result.defaultRetentionPeriod).toBeUndefined();
    });

    it('returns empty object when getDataStreamDetails returns empty in serverless', async () => {
      mockGetDataStreamDetails.mockResolvedValue({});

      const result = await handler(mockResources);

      expect(mockGetDataStreamDefaultRetentionPeriod).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });
  });
});

describe('updateFailureStoreRoute', () => {
  let mockResources: DatasetQualityRouteHandlerResources & {
    params: {
      path: { dataStream: string };
      body: { failureStoreEnabled: boolean; customRetentionPeriod: string | undefined };
    };
  };
  let mockLogger: ReturnType<typeof loggerMock.create>;
  let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;

  beforeEach(() => {
    mockLogger = loggerMock.create();
    mockRequest = httpServerMock.createKibanaRequest();
    mockEsClient = elasticsearchServiceMock.createScopedClusterClient();

    mockResources = {
      context: {
        core: Promise.resolve({
          elasticsearch: {
            client: mockEsClient,
          },
          savedObjects: {
            client: jest.fn(),
          },
          uiSettings: {
            client: jest.fn(),
          },
        }),
      } as any,
      logger: mockLogger,
      request: mockRequest,
      plugins: {
        fleet: {
          setup: {} as any,
          start: jest.fn().mockResolvedValue({
            packageService: {
              asScoped: jest.fn().mockReturnValue({}),
            },
          }),
        },
      } as any,
      getEsCapabilities: jest.fn(),
      params: {
        path: {
          dataStream: 'logs-test-default',
        },
        body: {
          failureStoreEnabled: true,
          customRetentionPeriod: '30d',
        },
      },
    } as any;

    mockUpdateFailureStore.mockResolvedValue({
      headers: { 'x-elastic-product': 'Elasticsearch' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('success scenarios', () => {
    it('should enable failure store with custom retention period in non-serverless', async () => {
      (mockResources.getEsCapabilities as jest.Mock).mockResolvedValue({
        serverless: false,
      });

      await updateFailureStoreHandler(mockResources);

      expect(mockUpdateFailureStore).toHaveBeenCalledWith({
        esClient: mockEsClient.asCurrentUser,
        dataStream: 'logs-test-default',
        failureStoreEnabled: true,
        customRetentionPeriod: '30d',
        isServerless: false,
      });
    });

    it('should enable failure store with custom retention period in serverless', async () => {
      (mockResources.getEsCapabilities as jest.Mock).mockResolvedValue({
        serverless: true,
      });

      await updateFailureStoreHandler(mockResources);

      expect(mockUpdateFailureStore).toHaveBeenCalledWith({
        esClient: mockEsClient.asCurrentUser,
        dataStream: 'logs-test-default',
        failureStoreEnabled: true,
        customRetentionPeriod: '30d',
        isServerless: true,
      });
    });

    it('should disable failure store without custom retention period', async () => {
      (mockResources.getEsCapabilities as jest.Mock).mockResolvedValue({
        serverless: false,
      });

      mockResources.params.body = {
        failureStoreEnabled: false,
        customRetentionPeriod: undefined,
      };

      await updateFailureStoreHandler(mockResources);

      expect(mockUpdateFailureStore).toHaveBeenCalledWith({
        esClient: mockEsClient.asCurrentUser,
        dataStream: 'logs-test-default',
        failureStoreEnabled: false,
        customRetentionPeriod: undefined,
        isServerless: false,
      });
    });

    it('should enable failure store without custom retention period', async () => {
      (mockResources.getEsCapabilities as jest.Mock).mockResolvedValue({
        serverless: false,
      });

      mockResources.params.body = {
        failureStoreEnabled: true,
        customRetentionPeriod: undefined,
      };

      await updateFailureStoreHandler(mockResources);

      expect(mockUpdateFailureStore).toHaveBeenCalledWith({
        esClient: mockEsClient.asCurrentUser,
        dataStream: 'logs-test-default',
        failureStoreEnabled: true,
        customRetentionPeriod: undefined,
        isServerless: false,
      });
    });
  });

  describe('error handling', () => {
    it('should propagate errors from updateFailureStore', async () => {
      (mockResources.getEsCapabilities as jest.Mock).mockResolvedValue({
        serverless: false,
      });

      const error = new Error('Elasticsearch connection failed');
      mockUpdateFailureStore.mockRejectedValue(error);

      await expect(updateFailureStoreHandler(mockResources)).rejects.toThrow(
        'Elasticsearch connection failed'
      );

      expect(mockUpdateFailureStore).toHaveBeenCalledWith({
        esClient: mockEsClient.asCurrentUser,
        dataStream: 'logs-test-default',
        failureStoreEnabled: true,
        customRetentionPeriod: '30d',
        isServerless: false,
      });
    });
  });
});
