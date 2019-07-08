/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  mockMsearchOptions,
  mockOptions,
  mockRequest,
  mockResponse,
  mockResult,
  mockNetworkEventsQueryDsl,
  mockUniqueFlowIdsQueryDsl,
  mockUniquePrvateIpsQueryDsl,
  mockDnsQueryDsl,
  mockTlsHandshakesQueryDsl,
  mockResultNoData,
  mockResponseNoData,
} from './mock';
import { buildNetworkEventsQuery } from './query_network_events.dsl';
import { buildUniqueFlowIdsQuery } from './query_unique_flow.dsl';
import { buildDnsQuery } from './query_dns.dsl';
import { buildTlsHandshakeQuery } from './query_tls_handshakes.dsl';
import { buildUniquePrvateIpQuery } from './query_unique_private_ips.dsl';
import { KpiNetworkData, KpiIpDetailsData } from '../../graphql/types';
import { ElasticsearchKpiNetworkAdapter } from './elasticsearch_adapter';
import { FrameworkRequest, FrameworkAdapter } from '../framework';

jest.mock('./query_network_events.dsl', () => {
  return { buildNetworkEventsQuery: jest.fn() };
});
jest.mock('./query_unique_flow.dsl', () => {
  return { buildUniqueFlowIdsQuery: jest.fn() };
});
jest.mock('./query_dns.dsl', () => {
  return { buildDnsQuery: jest.fn() };
});
jest.mock('./query_tls_handshakes.dsl', () => {
  return { buildTlsHandshakeQuery: jest.fn() };
});
jest.mock('./query_unique_private_ips.dsl', () => {
  return { buildUniquePrvateIpQuery: jest.fn() };
});

describe('Network Kpi elasticsearch_adapter', () => {
  let data: KpiNetworkData;

  const mockCallWithRequest = jest.fn();
  const mockFramework: FrameworkAdapter = {
    version: 'mock',
    callWithRequest: mockCallWithRequest,
    exposeStaticDir: jest.fn(),
    registerGraphQLEndpoint: jest.fn(),
    getIndexPatternsService: jest.fn(),
    getSavedObjectsService: jest.fn(),
  };

  let EsKpiNetwork: ElasticsearchKpiNetworkAdapter;

  describe('getKpiNetwork - call stack', () => {
    beforeAll(async () => {
      (buildNetworkEventsQuery as jest.Mock).mockReset();
      (buildNetworkEventsQuery as jest.Mock).mockReturnValue(mockNetworkEventsQueryDsl);
      (buildUniqueFlowIdsQuery as jest.Mock).mockReset();
      (buildUniqueFlowIdsQuery as jest.Mock).mockReturnValue(mockUniqueFlowIdsQueryDsl);
      (buildDnsQuery as jest.Mock).mockReset();
      (buildDnsQuery as jest.Mock).mockReturnValue(mockDnsQueryDsl);
      (buildUniquePrvateIpQuery as jest.Mock).mockReset();
      (buildUniquePrvateIpQuery as jest.Mock).mockReturnValue(mockUniquePrvateIpsQueryDsl);
      (buildTlsHandshakeQuery as jest.Mock).mockReset();
      (buildTlsHandshakeQuery as jest.Mock).mockReturnValue(mockTlsHandshakesQueryDsl);

      mockCallWithRequest.mockResolvedValue(mockResponse);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      EsKpiNetwork = new ElasticsearchKpiNetworkAdapter(mockFramework);
      data = await EsKpiNetwork.getKpiNetwork(mockRequest as FrameworkRequest, mockOptions);
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
      (buildNetworkEventsQuery as jest.Mock).mockClear();
      (buildUniqueFlowIdsQuery as jest.Mock).mockClear();
      (buildDnsQuery as jest.Mock).mockClear();
      (buildUniquePrvateIpQuery as jest.Mock).mockClear();
      (buildTlsHandshakeQuery as jest.Mock).mockClear();
    });

    test('should build query for network events with correct option', () => {
      expect(buildNetworkEventsQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should build query for unique flow IDs with correct option', () => {
      expect(buildUniqueFlowIdsQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should build query for unique private ip with correct option', () => {
      expect(buildUniquePrvateIpQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should build query for dns with correct option', () => {
      expect(buildDnsQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should build query for tls handshakes with correct option', () => {
      expect(buildTlsHandshakeQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should send msearch request', () => {
      expect(mockCallWithRequest).toHaveBeenCalledWith(mockRequest, 'msearch', mockMsearchOptions);
    });

    test('Happy Path - get Data', () => {
      expect(data).toEqual(mockResult);
    });
  });

  describe('Unhappy Path - No data', () => {
    beforeAll(async () => {
      mockCallWithRequest.mockResolvedValue(mockResponseNoData);
      (buildNetworkEventsQuery as jest.Mock).mockClear();
      (buildUniqueFlowIdsQuery as jest.Mock).mockClear();
      (buildDnsQuery as jest.Mock).mockClear();
      (buildUniquePrvateIpQuery as jest.Mock).mockClear();
      (buildTlsHandshakeQuery as jest.Mock).mockClear();

      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));

      EsKpiNetwork = new ElasticsearchKpiNetworkAdapter(mockFramework);
      data = await EsKpiNetwork.getKpiNetwork(mockRequest as FrameworkRequest, mockOptions);
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
      (buildNetworkEventsQuery as jest.Mock).mockClear();
      (buildUniqueFlowIdsQuery as jest.Mock).mockClear();
      (buildDnsQuery as jest.Mock).mockClear();
      (buildUniquePrvateIpQuery as jest.Mock).mockClear();
      (buildTlsHandshakeQuery as jest.Mock).mockClear();
    });

    test('getKpiNetwork - response without data', async () => {
      expect(data).toEqual(mockResultNoData);
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
  let mockBuildTransportBytesQuery: jest.SpyInstance;
  let mockBuildTopIpsQuery: jest.SpyInstance;
  let mockBuildTopPortsQuery: jest.SpyInstance;
  let mockBuildTopTransportQuery: jest.SpyInstance;
  let EsKpiIpDetails: ElasticsearchKpiNetworkAdapter;
  let data: KpiIpDetailsData;

  describe('getKpiIpDetails - call stack', () => {
    beforeAll(async () => {
      mockCallWithRequest.mockResolvedValue(mockKpiIpDetailsResponse);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      mockBuildTransportBytesQuery = jest
        .spyOn(transportBytesQueryDsl, 'buildTransportBytesQuery')
        .mockReturnValue([]);
      mockBuildTopIpsQuery = jest.spyOn(topIpsQueryDsl, 'buildTopIpsQuery').mockReturnValue([]);
      mockBuildTopPortsQuery = jest
        .spyOn(topPortsQueryDsl, 'buildTopPortsQuery')
        .mockReturnValue([]);
      mockBuildTopTransportQuery = jest
        .spyOn(topTransportQueryDsl, 'buildTopTransportQuery')
        .mockReturnValue([]);
      EsKpiIpDetails = new ElasticsearchKpiNetworkAdapter(mockFramework);
      data = await EsKpiIpDetails.getKpiIpDetails(mockRequest as FrameworkRequest, mockOptions);
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
      mockBuildTransportBytesQuery.mockRestore();
    });

    test('should build transport bytes query with correct option', () => {
      expect(mockBuildTransportBytesQuery).toHaveBeenCalledWith(mockOptions);
    });
    test('should build top transport IPs query with correct option', () => {
      expect(mockBuildTopIpsQuery).toHaveBeenCalledWith(mockOptions);
    });
    test('should build top transport port query with correct option', () => {
      expect(mockBuildTopPortsQuery).toHaveBeenCalledWith(mockOptions);
    });
    test('should build top transport protocal query with correct option', () => {
      expect(mockBuildTopTransportQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should send msearch request', () => {
      expect(mockCallWithRequest).toHaveBeenCalledWith(mockRequest, 'msearch', mockMsearchOptions);
    });
  });

  describe('Happy Path - get Data', () => {
    beforeAll(async () => {
      mockCallWithRequest.mockResolvedValue(mockKpiIpDetailsResponse);
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
      expect(data).toEqual(mockKpiIpDetailsResult);
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
        destinationByte: null,
        sourceByte: null,
        topDestinationIp: null,
        topDestinationIpTransportBytes: null,
        topDestinationPort: null,
        topSourceIp: null,
        topSourceIpTransportBytes: null,
        topTransport: null,
      });
    });
  });
});
