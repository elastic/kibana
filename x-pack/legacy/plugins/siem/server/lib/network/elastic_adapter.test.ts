/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';

import { FlowTargetSourceDest, NetworkTopNFlowData } from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';

import { ElasticsearchNetworkAdapter } from './elasticsearch_adapter';
import {
  mockOptions,
  mockRequest,
  mockResponse,
  mockResult,
  mockOptionsIp,
  mockRequestIp,
  mockResponseIp,
  mockResultIp,
  mockTopNFlowQueryDsl,
} from './mock';

jest.mock('./query_top_n_flow.dsl', () => {
  const r = jest.requireActual('./query_top_n_flow.dsl');
  return {
    ...r,
    buildTopNFlowQuery: jest.fn(() => mockTopNFlowQueryDsl),
  };
});

describe('Network Top N flow elasticsearch_adapter with FlowTarget=source', () => {
  describe('Happy Path - get Data', () => {
    const mockCallWithRequest = jest.fn();
    mockCallWithRequest.mockResolvedValue(mockResponse);
    const mockFramework: FrameworkAdapter = {
      version: 'mock',
      callWithRequest: mockCallWithRequest,
      getIndexPatternsService: jest.fn(),
      registerGraphQLEndpoint: jest.fn(),
    };
    jest.doMock('../framework', () => ({
      callWithRequest: mockCallWithRequest,
    }));

    test('getNetworkTopNFlow', async () => {
      const EsNetworkTopNFlow = new ElasticsearchNetworkAdapter(mockFramework);
      const data: NetworkTopNFlowData = await EsNetworkTopNFlow.getNetworkTopNFlow(
        mockRequest as FrameworkRequest,
        mockOptions
      );
      expect(data).toEqual(mockResult);
    });
  });

  describe('Unhappy Path - No data', () => {
    const mockNoDataResponse = cloneDeep(mockResponse);
    mockNoDataResponse.aggregations.top_n_flow_count.value = 0;
    mockNoDataResponse.aggregations[FlowTargetSourceDest.source].buckets = [];
    const mockCallWithRequest = jest.fn();
    mockCallWithRequest.mockResolvedValue(mockNoDataResponse);
    const mockFramework: FrameworkAdapter = {
      version: 'mock',
      callWithRequest: mockCallWithRequest,
      registerGraphQLEndpoint: jest.fn(),
      getIndexPatternsService: jest.fn(),
    };
    jest.doMock('../framework', () => ({
      callWithRequest: mockCallWithRequest,
    }));

    test('getNetworkTopNFlow', async () => {
      const EsNetworkTopNFlow = new ElasticsearchNetworkAdapter(mockFramework);
      const data: NetworkTopNFlowData = await EsNetworkTopNFlow.getNetworkTopNFlow(
        mockRequest as FrameworkRequest,
        mockOptions
      );
      expect(data).toEqual({
        inspect: {
          dsl: [JSON.stringify(mockTopNFlowQueryDsl, null, 2)],
          response: [JSON.stringify(mockNoDataResponse, null, 2)],
        },
        edges: [],
        pageInfo: {
          activePage: 0,
          fakeTotalCount: 0,
          showMorePagesIndicator: false,
        },
        totalCount: 0,
      });
    });
  });

  describe('Unhappy Path - No geo data', () => {
    const mockCallWithRequest = jest.fn();
    const mockNoGeoDataResponse = cloneDeep(mockResponse);
    // sometimes bad things happen to good ecs
    mockNoGeoDataResponse.aggregations[
      FlowTargetSourceDest.source
    ].buckets[0].location.top_geo.hits.hits = [];
    mockCallWithRequest.mockResolvedValue(mockNoGeoDataResponse);
    const mockFramework: FrameworkAdapter = {
      version: 'mock',
      callWithRequest: mockCallWithRequest,
      getIndexPatternsService: jest.fn(),
      registerGraphQLEndpoint: jest.fn(),
    };
    jest.doMock('../framework', () => ({
      callWithRequest: mockCallWithRequest,
    }));

    test('getNetworkTopNFlow', async () => {
      const EsNetworkTopNFlow = new ElasticsearchNetworkAdapter(mockFramework);
      const data: NetworkTopNFlowData = await EsNetworkTopNFlow.getNetworkTopNFlow(
        mockRequest as FrameworkRequest,
        mockOptions
      );
      expect(data).toMatchSnapshot();
    });
  });

  describe('No pagination', () => {
    const mockNoPaginationResponse = cloneDeep(mockResponse);
    mockNoPaginationResponse.aggregations.top_n_flow_count.value = 10;
    mockNoPaginationResponse.aggregations[
      FlowTargetSourceDest.source
    ].buckets = mockNoPaginationResponse.aggregations[FlowTargetSourceDest.source].buckets.slice(
      0,
      -1
    );
    const mockCallWithRequest = jest.fn();
    mockCallWithRequest.mockResolvedValue(mockNoPaginationResponse);
    const mockFramework: FrameworkAdapter = {
      version: 'mock',
      callWithRequest: mockCallWithRequest,
      registerGraphQLEndpoint: jest.fn(),
      getIndexPatternsService: jest.fn(),
    };
    jest.doMock('../framework', () => ({
      callWithRequest: mockCallWithRequest,
    }));

    test('getNetworkTopNFlow', async () => {
      const EsNetworkTopNFlow = new ElasticsearchNetworkAdapter(mockFramework);
      const data: NetworkTopNFlowData = await EsNetworkTopNFlow.getNetworkTopNFlow(
        mockRequest as FrameworkRequest,
        mockOptions
      );
      expect(data.pageInfo.showMorePagesIndicator).toBeFalsy();
    });
  });

  describe('Filter by IP', () => {
    const mockCallWithRequest = jest.fn();
    mockCallWithRequest.mockResolvedValue(mockResponseIp);
    const mockFramework: FrameworkAdapter = {
      version: 'mock',
      callWithRequest: mockCallWithRequest,
      getIndexPatternsService: jest.fn(),
      registerGraphQLEndpoint: jest.fn(),
    };
    jest.doMock('../framework', () => ({
      callWithRequest: mockCallWithRequest,
    }));

    test('getNetworkTopNFlow', async () => {
      const EsNetworkTopNFlow = new ElasticsearchNetworkAdapter(mockFramework);
      const data: NetworkTopNFlowData = await EsNetworkTopNFlow.getNetworkTopNFlow(
        mockRequestIp as FrameworkRequest,
        mockOptionsIp
      );
      expect(data).toEqual(mockResultIp);
    });
  });
});
