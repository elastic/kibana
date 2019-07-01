/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { FrameworkAdapter , FrameworkRequest } from '../framework';

// import { ElasticsearchKpiNetworkAdapter } from './elasticsearch_adapter';
import {
  mockMsearchOptions,
  mockOptions,
  mockRequest,
  mockResponse,
  // mockResult,
  mockNetworkEventsQueryDsl,
  mockUniqueFlowIdsQueryDsl,
  mockUniquePrvateIpsQueryDsl,
  mockDnsQueryDsl,
  mockTlsHandshakesQueryDsl,
  // mockResultNoData,
  // mockResponseNoData,
} from './mock';
import * as networkEventsQueryDsl from './query_network_events';
import * as uniqueFlowIdsQueryDsl from './query_unique_flow';
import * as dnsQueryDsl from './query_dns.dsl';
import * as tlsHandshakesQueryDsl from './query_tls_handshakes.dsl';
import * as uniquePrvateIpQueryDsl from './query_unique_private_ips.dsl';
// import { KpiNetworkData } from '../../graphql/types';

describe('Network Kpi elasticsearch_adapter', () => {
  const mockBuildNetworkEventsQuery = jest
    .spyOn(networkEventsQueryDsl, 'buildNetworkEventsQuery')
    .mockReturnValue(mockNetworkEventsQueryDsl);
  const mockBuildUniqueFlowIdsQuery = jest
    .spyOn(uniqueFlowIdsQueryDsl, 'buildUniqueFlowIdsQuery')
    .mockReturnValue(mockUniqueFlowIdsQueryDsl);
  const mockBuildUniquePrvateIpsQuery = jest
    .spyOn(uniquePrvateIpQueryDsl, 'buildUniquePrvateIpQuery')
    .mockReturnValue(mockUniquePrvateIpsQueryDsl);

  const mockBuildDnsQuery = jest
    .spyOn(dnsQueryDsl, 'buildDnsQuery')
    .mockReturnValue(mockDnsQueryDsl);
  const mockBuildTlsHandshakeQuery = jest
    .spyOn(tlsHandshakesQueryDsl, 'buildTlsHandshakeQuery')
    .mockReturnValue(mockTlsHandshakesQueryDsl);
  // let EsKpiNetwork: ElasticsearchKpiNetworkAdapter;
  // let data: KpiNetworkData;

  describe('getKpiNetwork - call stack', () => {
    const mockCallWithRequest = jest.fn();
    // const mockFramework: FrameworkAdapter = {
    //   version: 'mock',
    //   callWithRequest: mockCallWithRequest,
    //   exposeStaticDir: jest.fn(),
    //   registerGraphQLEndpoint: jest.fn(),
    //   getIndexPatternsService: jest.fn(),
    //   getSavedObjectsService: jest.fn(),
    // };
    mockCallWithRequest.mockResolvedValue(mockResponse);
    jest.doMock('../framework', () => ({
      callWithRequest: mockCallWithRequest,
    }));
    // beforeAll(async () => {
    //   EsKpiNetwork = new ElasticsearchKpiNetworkAdapter(mockFramework);
    //   data = await EsKpiNetwork.getKpiNetwork(mockRequest as FrameworkRequest, mockOptions);
    // });

    afterAll(() => {
      mockCallWithRequest.mockReset();
      mockBuildNetworkEventsQuery.mockReset();
      mockBuildUniqueFlowIdsQuery.mockReset();
      mockBuildUniquePrvateIpsQuery.mockReset();
      mockBuildDnsQuery.mockReset();
      mockBuildTlsHandshakeQuery.mockReset();
    });

    test('should build query for network events with correct option', () => {
      expect(mockBuildNetworkEventsQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should build query for unique flow IDs with correct option', () => {
      expect(mockBuildUniqueFlowIdsQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should build query for unique private ip with correct option', () => {
      expect(mockBuildUniquePrvateIpsQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should build query for dns with correct option', () => {
      expect(mockBuildDnsQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should build query for tls handshakes with correct option', () => {
      expect(mockBuildTlsHandshakeQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should send msearch request', () => {
      expect(mockCallWithRequest).toHaveBeenCalledWith(mockRequest, 'msearch', mockMsearchOptions);
    });
  });

  // describe('Happy Path - get Data', () => {
  //   const mockCallWithRequest = jest.fn();
  //   const mockFramework: FrameworkAdapter = {
  //     version: 'mock',
  //     callWithRequest: mockCallWithRequest,
  //     exposeStaticDir: jest.fn(),
  //     registerGraphQLEndpoint: jest.fn(),
  //     getIndexPatternsService: jest.fn(),
  //     getSavedObjectsService: jest.fn(),
  //   };
  //   mockCallWithRequest.mockResolvedValue(mockResponse);
  //   jest.doMock('../framework', () => ({
  //     callWithRequest: mockCallWithRequest,
  //   }));
  //   beforeAll(async () => {
  //     EsKpiNetwork = new ElasticsearchKpiNetworkAdapter(mockFramework);
  //     data = await EsKpiNetwork.getKpiNetwork(mockRequest as FrameworkRequest, mockOptions);
  //   });

  //   afterAll(() => {
  //     mockCallWithRequest.mockReset();
  //     mockBuildNetworkEventsQuery.mockReset();
  //     mockBuildUniqueFlowIdsQuery.mockReset();
  //     mockBuildUniquePrvateIpsQuery.mockReset();
  //     mockBuildDnsQuery.mockReset();
  //     mockBuildTlsHandshakeQuery.mockReset();
  //   });

  //   test('getKpiNetwork - response with data', () => {
  //     expect(data).toEqual(mockResult);
  //   });
  // });

  // describe('Unhappy Path - No data', () => {
  //   beforeAll(async () => {
  //     jest.doMock('../framework', () => ({
  //       callWithRequest: mockCallWithRequest,
  //     }));
  //     mockCallWithRequest.mockResolvedValue(mockResponseNoData);

  //     EsKpiNetwork = new ElasticsearchKpiNetworkAdapter(mockFramework);
  //     data = await EsKpiNetwork.getKpiNetwork(mockRequest as FrameworkRequest, mockOptions);
  //   });

  //   afterAll(() => {
  //     mockCallWithRequest.mockReset();
  //     mockBuildNetworkEventsQuery.mockReset();
  //     mockBuildUniqueFlowIdsQuery.mockReset();
  //     mockBuildUniquePrvateIpsQuery.mockReset();
  //     mockBuildDnsQuery.mockReset();
  //     mockBuildTlsHandshakeQuery.mockReset();
  //   });

  //   test('getKpiNetwork - response without data', async () => {
  //     expect(data).toEqual(mockResultNoData);
  //   });
  // });
});
