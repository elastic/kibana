/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkAdapter, FrameworkRequest } from '../framework';

import { ElasticsearchKpiNetworkAdapter } from './elasticsearch_adapter';
import { mockMsearchOptions, mockOptions, mockRequest, mockResponse, mockResult } from './mock';
import * as networkEventsQueryDsl from './query_network_events';
import * as uniqueFlowIdsQueryDsl from './query_unique_flow';
import * as dnsQueryDsl from './query_dns.dsl';
import * as tlsHandshakesQueryDsl from './query_tls_handshakes.dsl';
import * as uniquePrvateIpQueryDsl from './query_unique_private_ips.dsl';
import { KpiNetworkData, KpiIpDetailsData } from '../../graphql/types';

describe('Network Kpi elasticsearch_adapter - getKpiNetwork', () => {
  const mockCallWithRequest = jest.fn();
  const mockFramework: FrameworkAdapter = {
    version: 'mock',
    callWithRequest: mockCallWithRequest,
    exposeStaticDir: jest.fn(),
    registerGraphQLEndpoint: jest.fn(),
    getIndexPatternsService: jest.fn(),
    getSavedObjectsService: jest.fn(),
  };
  let mockBuildNetworkEventsQuery: jest.SpyInstance;
  let mockBuildUniqueFlowIdsQuery: jest.SpyInstance;
  let mockBuildUniquePrvateIpsQuery: jest.SpyInstance;
  let mockBuildDnsQuery: jest.SpyInstance;
  let mockBuildTlsHandshakeQuery: jest.SpyInstance;
  let EsKpiNetwork: ElasticsearchKpiNetworkAdapter;
  let data: KpiNetworkData;

  describe('getKpiNetwork - call stack', () => {
    beforeAll(async () => {
      mockCallWithRequest.mockResolvedValue(mockResponse);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      mockBuildNetworkEventsQuery = jest
        .spyOn(networkEventsQueryDsl, 'buildNetworkEventsQuery')
        .mockReturnValue([]);
      mockBuildUniqueFlowIdsQuery = jest
        .spyOn(uniqueFlowIdsQueryDsl, 'buildUniqueFlowIdsQuery')
        .mockReturnValue([]);
      mockBuildUniquePrvateIpsQuery = jest
        .spyOn(uniquePrvateIpQueryDsl, 'buildUniquePrvateIpQuery')
        .mockReturnValue([]);

      mockBuildDnsQuery = jest.spyOn(dnsQueryDsl, 'buildDnsQuery').mockReturnValue([]);
      mockBuildTlsHandshakeQuery = jest
        .spyOn(tlsHandshakesQueryDsl, 'buildTlsHandshakeQuery')
        .mockReturnValue([]);
      EsKpiNetwork = new ElasticsearchKpiNetworkAdapter(mockFramework);
      data = await EsKpiNetwork.getKpiNetwork(mockRequest as FrameworkRequest, mockOptions);
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
      mockBuildNetworkEventsQuery.mockRestore();
      mockBuildUniqueFlowIdsQuery.mockRestore();
      mockBuildUniquePrvateIpsQuery.mockRestore();
      mockBuildDnsQuery.mockRestore();
      mockBuildTlsHandshakeQuery.mockRestore();
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

  describe('Happy Path - get Data', () => {
    beforeAll(async () => {
      mockCallWithRequest.mockResolvedValue(mockResponse);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      EsKpiNetwork = new ElasticsearchKpiNetworkAdapter(mockFramework);
      data = await EsKpiNetwork.getKpiNetwork(mockRequest as FrameworkRequest, mockOptions);
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
    });

    test('getKpiNetwork - response with data', () => {
      expect(data).toEqual(mockResult);
    });
  });

  describe('Unhappy Path - No data', () => {
    beforeAll(async () => {
      mockCallWithRequest.mockResolvedValue(null);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      EsKpiNetwork = new ElasticsearchKpiNetworkAdapter(mockFramework);
      data = await EsKpiNetwork.getKpiNetwork(mockRequest as FrameworkRequest, mockOptions);
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
    });

    test('getKpiNetwork - response without data', async () => {
      expect(data).toEqual({
        networkEvents: null,
        uniqueFlowId: null,
        uniqueSourcePrivateIps: null,
        uniqueSourcePrivateIpsHistogram: null,
        uniqueDestinationPrivateIps: null,
        uniqueDestinationPrivateIpsHistogram: null,
        dnsQueries: null,
        tlsHandshakes: null,
      });
    });
  });
});

describe('Network Kpi elasticsearch_adapter - getKpiIpDetails', () => {
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
  let EsKpiIpDetails: ElasticsearchKpiNetworkAdapter;
  let data: KpiIpDetailsData;

  describe('getKpiIpDetails - call stack', () => {
    beforeAll(async () => {
      mockCallWithRequest.mockResolvedValue(mockResponse);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      mockBuildQuery = jest.spyOn(generalQueryDsl, 'buildGeneralQuery').mockReturnValue([]);
      EsKpiIpDetails = new ElasticsearchKpiNetworkAdapter(mockFramework);
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
      EsKpiIpDetails = new ElasticsearchKpiNetworkAdapter(mockFramework);
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
      EsKpiIpDetails = new ElasticsearchKpiNetworkAdapter(mockFramework);
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
