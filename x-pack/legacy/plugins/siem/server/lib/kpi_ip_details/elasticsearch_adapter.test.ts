/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkAdapter, FrameworkRequest } from '../framework';

import { ElasticsearchKpiIpDetailsAdapter } from './elasticsearch_adapter';
import { mockMsearchOptions, mockOptions, mockRequest, mockResponse, mockResult } from './mock';
import * as generalQueryDsl from './query_general.dsl';
import { KpiIpDetailsData } from '../../graphql/types';

describe('Network Kpi elasticsearch_adapter', () => {
  const mockCallWithRequest = jest.fn();
  const mockFramework: FrameworkAdapter = {
    version: 'mock',
    callWithRequest: mockCallWithRequest,
    exposeStaticDir: jest.fn(),
    registerGraphQLEndpoint: jest.fn(),
    getIndexPatternsService: jest.fn(),
    getSavedObjectsService: jest.fn(),
  };
  let mockBuildQuery: jest.SpyInstance;
  let EsKpiIpDetails: ElasticsearchKpiIpDetailsAdapter;
  let data: KpiIpDetailsData;

  describe('getKpiIpDetails - call stack', () => {
    beforeAll(async () => {
      mockCallWithRequest.mockResolvedValue(mockResponse);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      mockBuildQuery = jest.spyOn(generalQueryDsl, 'buildGeneralQuery').mockReturnValue([]);
      EsKpiIpDetails = new ElasticsearchKpiIpDetailsAdapter(mockFramework);
      data = await EsKpiIpDetails.getKpiIpDetails(mockRequest as FrameworkRequest, mockOptions);
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
      mockBuildQuery.mockRestore();
    });

    test('should build general query with correct option', () => {
      expect(mockBuildQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should send msearch request', () => {
      expect(mockCallWithRequest).toHaveBeenCalledWith(mockRequest, 'msearch', mockMsearchOptions);
    });
  });

  describe('Happy Path - get Data', () => {
    beforeAll(async () => {
      mockCallWithRequest.mockResolvedValue(mockResponse);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      EsKpiIpDetails = new ElasticsearchKpiIpDetailsAdapter(mockFramework);
      data = await EsKpiIpDetails.getKpiIpDetails(mockRequest as FrameworkRequest, mockOptions);
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
    });

    test('getKpiIpDetails - response with data', () => {
      expect(data).toEqual(mockResult);
    });
  });

  describe('Unhappy Path - No data', () => {
    beforeAll(async () => {
      mockCallWithRequest.mockResolvedValue(null);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      EsKpiIpDetails = new ElasticsearchKpiIpDetailsAdapter(mockFramework);
      data = await EsKpiIpDetails.getKpiIpDetails(mockRequest as FrameworkRequest, mockOptions);
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
    });

    test('getKpiIpDetails - response without data', async () => {
      expect(data).toEqual({
        connections: null,
        hosts: null,
        sourcePackets: null,
        sourcePacketsHistogram: null,
        destinationPackets: null,
        destinationPacketsHistogram: null,
        sourceByte: null,
        sourceByteHistogram: null,
        destinationByte: null,
        destinationByteHistogram: null,
      });
    });
  });
});
