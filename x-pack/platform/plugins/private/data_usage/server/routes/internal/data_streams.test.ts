/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedKeys } from '@kbn/utility-types-jest';
import type { CoreSetup } from '@kbn/core/server';
import { registerDataStreamsRoute } from './data_streams';
import { coreMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import type {
  DataUsageRequestHandlerContext,
  DataUsageRouter,
  DataUsageServerStart,
} from '../../types';
import { DATA_USAGE_DATA_STREAMS_API_ROUTE } from '../../../common';
import { createMockedDataUsageContext } from '../../mocks';
import { getMeteringStats } from '../../utils/get_metering_stats';
import { CustomHttpRequestError } from '../../utils';
import { NoIndicesMeteringError, NoPrivilegeMeteringError } from '../../errors';

jest.mock('../../utils/get_metering_stats');
const mockGetMeteringStats = getMeteringStats as jest.Mock;

describe('registerDataStreamsRoute', () => {
  let mockCore: MockedKeys<CoreSetup<{}, DataUsageServerStart>>;
  let router: DataUsageRouter;
  let context: DataUsageRequestHandlerContext;
  let mockedDataUsageContext: ReturnType<typeof createMockedDataUsageContext>;

  beforeEach(() => {
    mockCore = coreMock.createSetup();
    router = mockCore.http.createRouter();
    context = coreMock.createCustomRequestHandlerContext(
      coreMock.createRequestHandlerContext()
    ) as unknown as DataUsageRequestHandlerContext;

    mockedDataUsageContext = createMockedDataUsageContext(
      coreMock.createPluginInitializerContext()
    );
    registerDataStreamsRoute(router, mockedDataUsageContext);
  });

  it('should request correct API', () => {
    expect(router.versioned.get).toHaveBeenCalledTimes(1);
    expect(router.versioned.get).toHaveBeenCalledWith({
      access: 'internal',
      path: DATA_USAGE_DATA_STREAMS_API_ROUTE,
      security: {
        authz: {
          enabled: false,
          reason: expect.any(String),
        },
      },
    });
  });

  it('should correctly sort response', async () => {
    mockGetMeteringStats.mockResolvedValue({
      datastreams: [
        {
          name: 'datastream1',
          size_in_bytes: 100,
        },
        {
          name: 'datastream2',
          size_in_bytes: 200,
        },
      ],
    });
    const mockRequest = httpServerMock.createKibanaRequest({ body: {} });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRouter = mockCore.http.createRouter.mock.results[0].value;
    const [[, handler]] = mockRouter.versioned.get.mock.results[0].value.addVersion.mock.calls;
    await handler(context, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({
      body: [
        {
          name: 'datastream2',
          storageSizeBytes: 200,
        },
        {
          name: 'datastream1',
          storageSizeBytes: 100,
        },
      ],
    });
  });

  it('should not include data streams with 0 size', async () => {
    mockGetMeteringStats.mockResolvedValue({
      datastreams: [
        {
          name: 'datastream1',
          size_in_bytes: 100,
        },
        {
          name: 'datastream2',
          size_in_bytes: 200,
        },
        {
          name: 'datastream3',
          size_in_bytes: 0,
        },
        {
          name: 'datastream4',
          size_in_bytes: 0,
        },
      ],
    });
    const mockRequest = httpServerMock.createKibanaRequest({ body: {} });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRouter = mockCore.http.createRouter.mock.results[0].value;
    const [[, handler]] = mockRouter.versioned.get.mock.results[0].value.addVersion.mock.calls;
    await handler(context, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({
      body: [
        {
          name: 'datastream2',
          storageSizeBytes: 200,
        },
        {
          name: 'datastream1',
          storageSizeBytes: 100,
        },
      ],
    });
  });

  it('should not include `dot` indices/data streams that start with a `.`', async () => {
    mockGetMeteringStats.mockResolvedValue({
      datastreams: [
        {
          name: 'ds-1',
          size_in_bytes: 100,
        },
        {
          name: '.ds-2',
          size_in_bytes: 200,
        },
        {
          name: 'ds-3',
          size_in_bytes: 500,
        },
        {
          name: '.ds-4',
          size_in_bytes: 0,
        },
      ],
    });
    const mockRequest = httpServerMock.createKibanaRequest({ body: {} });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRouter = mockCore.http.createRouter.mock.results[0].value;
    const [[, handler]] = mockRouter.versioned.get.mock.results[0].value.addVersion.mock.calls;
    await handler(context, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({
      body: [
        {
          name: 'ds-3',
          storageSizeBytes: 500,
        },
        {
          name: 'ds-1',
          storageSizeBytes: 100,
        },
      ],
    });
  });

  it('should return correct error if metering stats request fails with an unknown error', async () => {
    // using custom error for test here to avoid having to import the actual error class
    mockGetMeteringStats.mockRejectedValue(
      new CustomHttpRequestError('Error getting metring stats!')
    );
    const mockRequest = httpServerMock.createKibanaRequest({ body: {} });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRouter = mockCore.http.createRouter.mock.results[0].value;
    const [[, handler]] = mockRouter.versioned.get.mock.results[0].value.addVersion.mock.calls;
    await handler(context, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledTimes(1);
    expect(mockResponse.customError).toHaveBeenCalledWith({
      body: new CustomHttpRequestError('Error getting metring stats!'),
      statusCode: 500,
    });
  });

  it('should return `not found` error if metering stats request fails when no indices', async () => {
    mockGetMeteringStats.mockRejectedValue(
      new Error(JSON.stringify({ message: 'index_not_found_exception' }))
    );
    const mockRequest = httpServerMock.createKibanaRequest({ body: {} });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRouter = mockCore.http.createRouter.mock.results[0].value;
    const [[, handler]] = mockRouter.versioned.get.mock.results[0].value.addVersion.mock.calls;
    await handler(context, mockRequest, mockResponse);

    expect(mockResponse.notFound).toHaveBeenCalledTimes(1);
    expect(mockResponse.notFound).toHaveBeenCalledWith({
      body: new NoIndicesMeteringError(),
    });
  });

  it('should return `forbidden` error if metering stats request fails with privileges error', async () => {
    mockGetMeteringStats.mockRejectedValue(
      new Error(JSON.stringify({ message: 'security_exception' }))
    );
    const mockRequest = httpServerMock.createKibanaRequest({ body: {} });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRouter = mockCore.http.createRouter.mock.results[0].value;
    const [[, handler]] = mockRouter.versioned.get.mock.results[0].value.addVersion.mock.calls;
    await handler(context, mockRequest, mockResponse);

    expect(mockResponse.forbidden).toHaveBeenCalledTimes(1);
    expect(mockResponse.forbidden).toHaveBeenCalledWith({
      body: new NoPrivilegeMeteringError(),
    });
  });

  it.each([
    ['no datastreams key in response', { indices: [] }, []],
    ['empty datastreams array', { indices: [], datastreams: [] }, []],
    ['an empty element', { indices: [], datastreams: [{}] }, []],
  ])('should return empty array when no stats data with %s', async (_, stats, res) => {
    mockGetMeteringStats.mockResolvedValue(stats);
    const mockRequest = httpServerMock.createKibanaRequest({ body: {} });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRouter = mockCore.http.createRouter.mock.results[0].value;
    const [[, handler]] = mockRouter.versioned.get.mock.results[0].value.addVersion.mock.calls;
    await handler(context, mockRequest, mockResponse);

    // @ts-expect-error
    if (stats && stats.datastreams && stats.datastreams.length) {
      expect(mockResponse.customError).toHaveBeenCalledTimes(1);
      expect(mockResponse.customError).toHaveBeenCalledWith({
        body: new CustomHttpRequestError(
          'No relevant user defined data streams found with storage size greater than zero',
          404
        ),
        statusCode: 404,
      });
    } else {
      expect(mockResponse.customError).toHaveBeenCalledTimes(1);
      expect(mockResponse.customError).toHaveBeenCalledWith({
        body: new CustomHttpRequestError('No data streams found', 404),
        statusCode: 404,
      });
    }
  });
});
