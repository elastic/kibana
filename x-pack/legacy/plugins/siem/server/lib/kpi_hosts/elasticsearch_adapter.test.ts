/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkAdapter, FrameworkRequest } from '../framework';

import { ElasticsearchKpiHostsAdapter } from './elasticsearch_adapter';
import {
  mockKpiHostsAuthQuery,
  mockKpiHostDetailsAuthQuery,
  mockHostsQuery,
  mockKpiHostsUniqueIpsQuery,
  mockKpiHostDetailsUniqueIpsQuery,
  mockKpiHostsMsearchOptions,
  mockKpiHostsOptions,
  mockKpiHostDetailsOptions,
  mockKpiHostsRequest,
  mockKpiHostDetailsRequest,
  mockKpiHostsResponse,
  mockKpiHostDetailsResponse,
  mockKpiHostsResult,
  mockKpiHostDetailsResult,
  mockKpiHostDetailsDsl,
  mockKpiHostsQueryDsl,
  mockKpiHostDetailsMsearchOptions,
  mockKpiHostsResponseNodata,
  mockKpiHostDetailsResponseNoData,
} from './mock';
import { buildAuthQuery } from './query_authentication.dsl';
import { buildUniqueIpsQuery } from './query_unique_ips.dsl';
import { buildHostsQuery } from './query_hosts.dsl';
import { KpiHostsData, KpiHostDetailsData } from '../../graphql/types';

jest.mock('./query_authentication.dsl', () => {
  return {
    buildAuthQuery: jest.fn(),
  };
});
jest.mock('./query_unique_ips.dsl', () => {
  return {
    buildUniqueIpsQuery: jest.fn(),
  };
});
jest.mock('./query_hosts.dsl', () => {
  return {
    buildHostsQuery: jest.fn(),
  };
});

describe('getKpiHosts', () => {
  let data: KpiHostsData;
  const mockCallWithRequest = jest.fn();
  const mockFramework: FrameworkAdapter = {
    version: 'mock',
    callWithRequest: mockCallWithRequest,
    registerGraphQLEndpoint: jest.fn(),
    getIndexPatternsService: jest.fn(),
  };
  let EsKpiHosts: ElasticsearchKpiHostsAdapter;

  describe('getKpiHosts - call stack', () => {
    beforeAll(async () => {
      (buildUniqueIpsQuery as jest.Mock).mockReset();
      (buildUniqueIpsQuery as jest.Mock).mockReturnValue(mockKpiHostsUniqueIpsQuery);
      (buildAuthQuery as jest.Mock).mockReset();
      (buildAuthQuery as jest.Mock).mockReturnValue(mockKpiHostsAuthQuery);
      (buildHostsQuery as jest.Mock).mockReset();
      (buildHostsQuery as jest.Mock).mockReturnValue(mockHostsQuery);
      mockCallWithRequest.mockResolvedValue(mockKpiHostsResponse);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));

      EsKpiHosts = new ElasticsearchKpiHostsAdapter(mockFramework);
      data = await EsKpiHosts.getKpiHosts(
        mockKpiHostsRequest as FrameworkRequest,
        mockKpiHostsOptions
      );
    });

    afterAll(() => {
      mockCallWithRequest.mockRestore();
      (buildUniqueIpsQuery as jest.Mock).mockClear();
      (buildAuthQuery as jest.Mock).mockClear();
      (buildHostsQuery as jest.Mock).mockClear();
    });

    test('should build general query with correct option', () => {
      expect(buildUniqueIpsQuery).toHaveBeenCalledWith(mockKpiHostsOptions);
    });

    test('should build auth query with correct option', () => {
      expect(buildAuthQuery).toHaveBeenCalledWith(mockKpiHostsOptions);
    });

    test('should build hosts query with correct option', () => {
      expect(buildHostsQuery).toHaveBeenCalledWith(mockKpiHostsOptions);
    });

    test('should send msearch request', () => {
      expect(mockCallWithRequest).toHaveBeenCalledWith(
        mockKpiHostsRequest,
        'msearch',
        mockKpiHostsMsearchOptions
      );
    });

    test('Happy Path - get Data', () => {
      expect(data).toEqual(mockKpiHostsResult);
    });
  });

  describe('Unhappy Path - No data', () => {
    beforeAll(async () => {
      (buildUniqueIpsQuery as jest.Mock).mockReset();
      (buildUniqueIpsQuery as jest.Mock).mockReturnValue(mockKpiHostsUniqueIpsQuery);
      (buildAuthQuery as jest.Mock).mockReset();
      (buildAuthQuery as jest.Mock).mockReturnValue(mockKpiHostsAuthQuery);
      (buildHostsQuery as jest.Mock).mockReset();
      (buildHostsQuery as jest.Mock).mockReturnValue(mockHostsQuery);
      mockCallWithRequest.mockResolvedValue(mockKpiHostsResponseNodata);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      EsKpiHosts = new ElasticsearchKpiHostsAdapter(mockFramework);
      data = await EsKpiHosts.getKpiHosts(
        mockKpiHostsRequest as FrameworkRequest,
        mockKpiHostsOptions
      );
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
      (buildUniqueIpsQuery as jest.Mock).mockClear();
      (buildAuthQuery as jest.Mock).mockClear();
      (buildHostsQuery as jest.Mock).mockClear();
    });

    test('getKpiHosts - response without data', async () => {
      expect(data).toEqual({
        inspect: {
          dsl: mockKpiHostsQueryDsl,
          response: [
            JSON.stringify(mockKpiHostsResponseNodata.responses[0], null, 2),
            JSON.stringify(mockKpiHostsResponseNodata.responses[1], null, 2),
            JSON.stringify(mockKpiHostsResponseNodata.responses[2], null, 2),
          ],
        },
        hosts: null,
        hostsHistogram: null,
        authSuccess: null,
        authSuccessHistogram: null,
        authFailure: null,
        authFailureHistogram: null,
        uniqueSourceIps: null,
        uniqueSourceIpsHistogram: null,
        uniqueDestinationIps: null,
        uniqueDestinationIpsHistogram: null,
      });
    });
  });
});

describe('getKpiHostDetails', () => {
  let data: KpiHostDetailsData;
  const mockCallWithRequest = jest.fn();
  const mockFramework: FrameworkAdapter = {
    version: 'mock',
    callWithRequest: mockCallWithRequest,
    registerGraphQLEndpoint: jest.fn(),
    getIndexPatternsService: jest.fn(),
  };
  let EsKpiHosts: ElasticsearchKpiHostsAdapter;

  describe('getKpiHostDetails - call stack', () => {
    beforeAll(async () => {
      (buildUniqueIpsQuery as jest.Mock).mockReset();
      (buildUniqueIpsQuery as jest.Mock).mockReturnValue(mockKpiHostDetailsUniqueIpsQuery);
      (buildAuthQuery as jest.Mock).mockReset();
      (buildAuthQuery as jest.Mock).mockReturnValue(mockKpiHostDetailsAuthQuery);
      (buildHostsQuery as jest.Mock).mockReset();
      mockCallWithRequest.mockReset();
      mockCallWithRequest.mockResolvedValue(mockKpiHostDetailsResponse);

      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      EsKpiHosts = new ElasticsearchKpiHostsAdapter(mockFramework);
      data = await EsKpiHosts.getKpiHostDetails(
        mockKpiHostDetailsRequest as FrameworkRequest,
        mockKpiHostDetailsOptions
      );
    });

    afterAll(() => {
      mockCallWithRequest.mockRestore();
      (buildUniqueIpsQuery as jest.Mock).mockClear();
      (buildAuthQuery as jest.Mock).mockClear();
      (buildHostsQuery as jest.Mock).mockClear();
    });

    test('should build unique Ip query with correct option', () => {
      expect(buildUniqueIpsQuery).toHaveBeenCalledWith(mockKpiHostDetailsOptions);
    });

    test('should build auth query with correct option', () => {
      expect(buildAuthQuery).toHaveBeenCalledWith(mockKpiHostDetailsOptions);
    });

    test('should not build hosts query', () => {
      expect(buildHostsQuery).not.toHaveBeenCalled();
    });

    test('should send msearch request', () => {
      expect(mockCallWithRequest).toHaveBeenCalledWith(
        mockKpiHostDetailsRequest,
        'msearch',
        mockKpiHostDetailsMsearchOptions
      );
    });
  });

  describe('Happy Path - get Data', () => {
    beforeAll(async () => {
      mockCallWithRequest.mockResolvedValue(mockKpiHostDetailsResponse);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      EsKpiHosts = new ElasticsearchKpiHostsAdapter(mockFramework);
      data = await EsKpiHosts.getKpiHostDetails(
        mockKpiHostDetailsRequest as FrameworkRequest,
        mockKpiHostDetailsOptions
      );
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
    });

    test('getKpiHostDetails - response with data', () => {
      expect(data).toEqual(mockKpiHostDetailsResult);
    });
  });

  describe('Unhappy Path - no Data', () => {
    beforeEach(async () => {
      mockCallWithRequest.mockResolvedValue(mockKpiHostDetailsResponseNoData);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      EsKpiHosts = new ElasticsearchKpiHostsAdapter(mockFramework);
      data = await EsKpiHosts.getKpiHostDetails(
        mockKpiHostDetailsRequest as FrameworkRequest,
        mockKpiHostDetailsOptions
      );
    });

    afterAll(() => {
      mockCallWithRequest.mockRestore();
    });

    test('getKpiHostDetails - response without data', async () => {
      expect(data).toEqual({
        inspect: {
          dsl: mockKpiHostDetailsDsl,
          response: [
            JSON.stringify(mockKpiHostDetailsResponseNoData.responses[0]),
            JSON.stringify(mockKpiHostDetailsResponseNoData.responses[1]),
          ],
        },
        authSuccess: null,
        authSuccessHistogram: null,
        authFailure: null,
        authFailureHistogram: null,
        uniqueSourceIps: null,
        uniqueSourceIpsHistogram: null,
        uniqueDestinationIps: null,
        uniqueDestinationIpsHistogram: null,
      });
    });
  });
});
