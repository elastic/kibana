/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MockedKeys } from '@kbn/utility-types-jest';
import type { CoreSetup } from '@kbn/core/server';
import { registerUsageMetricsRoute } from './usage_metrics';
import { coreMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { DataUsageService } from '../../services';
import type {
  DataUsageRequestHandlerContext,
  DataUsageRouter,
  DataUsageServerStart,
} from '../../types';
import { DATA_USAGE_METRICS_API_ROUTE } from '../../../common';
import { createMockedDataUsageContext } from '../../mocks';
import { CustomHttpRequestError } from '../../utils';
import { AutoOpsError } from '../../errors';
import { transformToUTCtime } from '../../../common/utils';

const timeRange = {
  start: 'now-15m',
  end: 'now',
};
const utcTimeRange = transformToUTCtime({
  ...timeRange,
  isISOString: true,
});

describe('registerUsageMetricsRoute', () => {
  let mockCore: MockedKeys<CoreSetup<{}, DataUsageServerStart>>;
  let router: DataUsageRouter;
  let dataUsageService: DataUsageService;
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
    dataUsageService = new DataUsageService(mockedDataUsageContext.logFactory.get());
  });

  it('should request correct API', () => {
    registerUsageMetricsRoute(router, mockedDataUsageContext);

    expect(router.versioned.post).toHaveBeenCalledTimes(1);
    expect(router.versioned.post).toHaveBeenCalledWith({
      access: 'internal',
      path: DATA_USAGE_METRICS_API_ROUTE,
      security: {
        authz: {
          enabled: false,
          reason: expect.any(String),
        },
      },
    });
  });

  it('should throw error if no data streams in the request', async () => {
    registerUsageMetricsRoute(router, mockedDataUsageContext);

    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        from: utcTimeRange.start,
        to: utcTimeRange.end,
        metricTypes: ['ingest_rate'],
        dataStreams: [],
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRouter = mockCore.http.createRouter.mock.results[0].value;
    const [[, handler]] = mockRouter.versioned.post.mock.results[0].value.addVersion.mock.calls;
    await handler(context, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledTimes(1);
    expect(mockResponse.customError).toHaveBeenCalledWith({
      body: new CustomHttpRequestError('[request body.dataStreams]: no data streams selected'),
      statusCode: 400,
    });
  });

  // TODO: fix this test
  it.skip('should correctly transform response', async () => {
    (await context.core).elasticsearch.client.asCurrentUser.indices.getDataStream = jest
      .fn()
      .mockResolvedValue({
        data_streams: [{ name: '.ds-1' }, { name: '.ds-2' }],
      });

    dataUsageService.getMetrics = jest.fn().mockResolvedValue({
      metrics: {
        ingest_rate: [
          {
            name: '.ds-1',
            data: [
              [1726858530000, 13756849],
              [1726862130000, 14657904],
            ],
          },
          {
            name: '.ds-2',
            data: [
              [1726858530000, 12894623],
              [1726862130000, 14436905],
            ],
          },
        ],
        storage_retained: [
          {
            name: '.ds-1',
            data: [
              [1726858530000, 12576413],
              [1726862130000, 13956423],
            ],
          },
          {
            name: '.ds-2',
            data: [
              [1726858530000, 12894623],
              [1726862130000, 14436905],
            ],
          },
        ],
      },
    });

    registerUsageMetricsRoute(router, mockedDataUsageContext);

    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        from: utcTimeRange.start,
        to: utcTimeRange.end,
        metricTypes: ['ingest_rate', 'storage_retained'],
        dataStreams: ['.ds-1', '.ds-2'],
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRouter = mockCore.http.createRouter.mock.results[0].value;
    const [[, handler]] = mockRouter.versioned.post.mock.results[0].value.addVersion.mock.calls;
    await handler(context, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    expect(mockResponse.ok.mock.calls[0][0]).toEqual({
      body: {
        metrics: {
          ingest_rate: [
            {
              name: '.ds-1',
              data: [
                { x: 1726858530000, y: 13756849 },
                { x: 1726862130000, y: 14657904 },
              ],
            },
            {
              name: '.ds-2',
              data: [
                { x: 1726858530000, y: 12894623 },
                { x: 1726862130000, y: 14436905 },
              ],
            },
          ],
          storage_retained: [
            {
              name: '.ds-1',
              data: [
                { x: 1726858530000, y: 12576413 },
                { x: 1726862130000, y: 13956423 },
              ],
            },
            {
              name: '.ds-2',
              data: [
                { x: 1726858530000, y: 12894623 },
                { x: 1726862130000, y: 14436905 },
              ],
            },
          ],
        },
      },
    });
  });

  describe('when metric type data is null or not present', () => {
    beforeEach(() => {
      jest.spyOn(DataUsageService.prototype, 'getMetrics').mockResolvedValue({
        ingest_rate: [
          {
            name: '.ds-1',
            error: null,
            data: null,
          },
          {
            name: '.ds-2',
            error: null,
            data: [
              [1726858530000, 12894623],
              [1726862130000, 14436905],
            ],
          },
        ],
        storage_retained: [
          {
            name: '.ds-1',
            error: null,
            data: [
              [1726858530000, 12576413],
              [1726862130000, 13956423],
            ],
          },
          {
            name: '.ds-2',
            error: null,
          },
        ],
        search_vcu: [],
        ingest_vcu: [],
        ml_vcu: [],
        index_latency: [],
        index_rate: [],
        search_latency: [],
        search_rate: [],
      });
    });
    it('should correctly transform response when metric type data is null', async () => {
      (await context.core).elasticsearch.client.asCurrentUser.indices.getDataStream = jest
        .fn()
        .mockResolvedValue({
          data_streams: [{ name: '.ds-1' }, { name: '.ds-2' }],
        });

      registerUsageMetricsRoute(router, mockedDataUsageContext);

      const mockRequest = httpServerMock.createKibanaRequest({
        body: {
          from: utcTimeRange.start,
          to: utcTimeRange.end,
          metricTypes: ['ingest_rate', 'storage_retained'],
          dataStreams: ['.ds-1', '.ds-2'],
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();
      const mockRouter = mockCore.http.createRouter.mock.results[0].value;
      const [[, handler]] = mockRouter.versioned.post.mock.results[0].value.addVersion.mock.calls;
      await handler(context, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledTimes(1);
      expect(mockResponse.ok.mock.calls[0][0]).toEqual({
        body: {
          ingest_rate: [
            {
              name: '.ds-1',
              data: [],
            },
            {
              name: '.ds-2',
              data: [
                { x: 1726858530000, y: 12894623 },
                { x: 1726862130000, y: 14436905 },
              ],
            },
          ],
          storage_retained: [
            {
              name: '.ds-1',
              data: [
                { x: 1726858530000, y: 12576413 },
                { x: 1726862130000, y: 13956423 },
              ],
            },
            {
              name: '.ds-2',
              data: [],
            },
          ],
          search_vcu: [],
          ingest_vcu: [],
          ml_vcu: [],
          index_latency: [],
          index_rate: [],
          search_latency: [],
          search_rate: [],
        },
      });
    });
  });

  // TODO: fix this test
  it.skip('should throw error if error on requesting auto ops service', async () => {
    (await context.core).elasticsearch.client.asCurrentUser.indices.getDataStream = jest
      .fn()
      .mockResolvedValue({
        data_streams: [{ name: '.ds-1' }, { name: '.ds-2' }],
      });

    dataUsageService.getMetrics = jest
      .fn()
      .mockRejectedValue(new AutoOpsError('Uh oh, something went wrong!'));

    registerUsageMetricsRoute(router, mockedDataUsageContext);

    const mockRequest = httpServerMock.createKibanaRequest({
      body: {
        from: utcTimeRange.start,
        to: utcTimeRange.end,
        metricTypes: ['ingest_rate'],
        dataStreams: ['.ds-1', '.ds-2'],
      },
    });
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRouter = mockCore.http.createRouter.mock.results[0].value;
    const [[, handler]] = mockRouter.versioned.post.mock.results[0].value.addVersion.mock.calls;
    await handler(context, mockRequest, mockResponse);

    expect(mockResponse.customError).toHaveBeenCalledTimes(1);
    expect(mockResponse.customError).toHaveBeenCalledWith({
      body: new AutoOpsError('Uh oh, something went wrong!'),
      statusCode: 503,
    });
  });
});
