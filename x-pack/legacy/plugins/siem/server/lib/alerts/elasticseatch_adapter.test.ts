/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FrameworkAdapter, FrameworkRequest } from '../framework';

import { ElasticsearchAlertsAdapter } from './elasticsearch_adapter';
import { mockAlertsQueryDsl, mockOptions, mockRequest, mockAlertsResponse } from './mock';

jest.mock('./query.dsl', () => {
  return {
    buildAlertsQuery: jest.fn(() => mockAlertsQueryDsl),
  };
});

describe('alerts elasticsearch_adapter', () => {
  describe('alerts', () => {
    test('Happy Path ', async () => {
      const mockCallWithRequest = jest.fn();
      mockCallWithRequest.mockImplementation((req: FrameworkRequest, method: string) => {
        return mockAlertsResponse;
      });
      const mockFramework: FrameworkAdapter = {
        version: 'mock',
        callWithRequest: mockCallWithRequest,
        exposeStaticDir: jest.fn(),
        registerGraphQLEndpoint: jest.fn(),
        getIndexPatternsService: jest.fn(),
        getSavedObjectsService: jest.fn(),
      };
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));

      const EsNetworkTimelineAlerts = new ElasticsearchAlertsAdapter(mockFramework);
      const data = await EsNetworkTimelineAlerts.getAlertsData(
        mockRequest as FrameworkRequest,
        mockOptions
      );

      expect(data).toEqual({});
    });
  });
});
