/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FrameworkAdapter, FrameworkRequest, MatrixHistogramRequestOptions } from '../framework';

import expect from '@kbn/expect';
import { ElasticsearchAlertsAdapter } from './elasticsearch_adapter';
import {
  mockRequest,
  mockOptions,
  mockAlertsHistogramDataResponse,
  mockAlertsHistogramQueryDsl,
  mockAlertsHistogramDataFormattedResponse,
} from './mock';

jest.mock('./query.dsl', () => {
  return {
    buildAlertsHistogramQuery: jest.fn(() => mockAlertsHistogramQueryDsl),
  };
});

describe('alerts elasticsearch_adapter', () => {
  describe('getAlertsHistogramData', () => {
    test('Happy Path ', async () => {
      const mockCallWithRequest = jest.fn();
      mockCallWithRequest.mockImplementation((req: FrameworkRequest, method: string) => {
        return mockAlertsHistogramDataResponse;
      });
      const mockFramework: FrameworkAdapter = {
        version: 'mock',
        callWithRequest: mockCallWithRequest,
        registerGraphQLEndpoint: jest.fn(),
        getIndexPatternsService: jest.fn(),
      };
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));

      const EsNetworkTimelineAlerts = new ElasticsearchAlertsAdapter(mockFramework);
      const data = await EsNetworkTimelineAlerts.getAlertsHistogramData(
        (mockRequest as unknown) as FrameworkRequest,
        (mockOptions as unknown) as MatrixHistogramRequestOptions
      );

      expect(data).to.eql({
        AlertsOverTimeByModule: mockAlertsHistogramDataFormattedResponse,
        inspect: {
          dsl: ['"mockAlertsHistogramQueryDsl"'],
          response: [JSON.stringify(mockAlertsHistogramDataResponse, null, 2)],
        },
        totalCount: 1599508,
      });
    });
  });
});
