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
} from './mock';
import { buildAuthQuery } from './query_authentication.dsl';
import { buildUniqueIpsQuery } from './query_unique_ips.dsl';
import { buildHostsQuery } from './query_hosts.dsl';
import { KpiHostsData } from '../../graphql/types';

jest.mock('./query_authentication.dsl', () => {
  return {
    buildAuthQuery: jest.fn(() => mockKpiHostsAuthQuery),
  };
});
jest.mock('./query_unique_ips.dsl', () => {
  return {
    buildUniqueIpsQuery: jest.fn(() => mockKpiHostsUniqueIpsQuery),
  };
});
jest.mock('./query_hosts.dsl', () => {
  return {
    buildHostsQuery: jest.fn(() => mockHostsQuery),
  };
});

describe('getKpiHosts', () => {
  let data: KpiHostsData;
  const mockCallWithRequest = jest.fn();
  const mockFramework: FrameworkAdapter = {
    version: 'mock',
    callWithRequest: mockCallWithRequest,
    exposeStaticDir: jest.fn(),
    registerGraphQLEndpoint: jest.fn(),
    getIndexPatternsService: jest.fn(),
    getSavedObjectsService: jest.fn(),
  };
  let EsKpiHosts: ElasticsearchKpiHostsAdapter;

  describe('getKpiHosts - call stack', () => {
    beforeAll(async () => {
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
      // @ts-ignore
      buildUniqueIpsQuery.mockClear();
      // @ts-ignore
      buildAuthQuery.mockClear();
      // @ts-ignore
      buildHostsQuery.mockClear();
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
  });

  describe('Happy Path - get Data', () => {
    beforeAll(async () => {
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
      mockCallWithRequest.mockReset();
    });

    test('getKpiHosts - response with data', () => {
      expect(data).toEqual(mockKpiHostsResult);
    });
  });

  describe('Unhappy Path - No data', () => {
    const mockKpiHostsResponseNodata = { responses: [null, null, null] };
    beforeAll(async () => {
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
    });

    test('getKpiHosts - response without data', async () => {
      expect(data).toEqual({
        inspect: {
          dsl: [
            JSON.stringify(mockHostsQuery[1], null, 2),
            JSON.stringify(mockKpiHostsAuthQuery[1], null, 2),
            JSON.stringify(mockKpiHostsUniqueIpsQuery[1], null, 2),
          ],
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
  // let data: KpiHostDetailsData;
  let EsKpiHosts: ElasticsearchKpiHostsAdapter;

  const mockCallWithRequest = jest.fn();
  const mockFramework: FrameworkAdapter = {
    version: 'mock',
    callWithRequest: mockCallWithRequest,
    exposeStaticDir: jest.fn(),
    registerGraphQLEndpoint: jest.fn(),
    getIndexPatternsService: jest.fn(),
    getSavedObjectsService: jest.fn(),
  };
  mockCallWithRequest.mockResolvedValue(mockKpiHostDetailsResponse);
  jest.doMock('../framework', () => ({
    callWithRequest: mockCallWithRequest,
  }));

  describe('getKpiHostDetails - call stack', () => {
    beforeAll(async () => {
      EsKpiHosts = new ElasticsearchKpiHostsAdapter(mockFramework);
      data = await EsKpiHosts.getKpiHostDetails(
        mockKpiHostDetailsRequest as FrameworkRequest,
        mockKpiHostDetailsOptions
      );
      // @ts-ignore
      buildUniqueIpsQuery.mockReturnValue(mockKpiHostDetailsUniqueIpsQuery);
      // @ts-ignore
      buildAuthQuery.mockReturnValue(mockKpiHostDetailsAuthQuery);
    });

    afterAll(() => {
      mockCallWithRequest.mockRestore();
      // @ts-ignore
      buildUniqueIpsQuery.mockReset();
      // @ts-ignore
      buildAuthQuery.mockReset();
      // @ts-ignore
      buildHostsQuery.mockReset();
    });

    test('should build unique Ip query with correct option', () => {
      expect(buildUniqueIpsQuery).toHaveBeenCalledWith(mockKpiHostDetailsOptions);
    });

    test('should build auth query with correct option', () => {
      expect(buildAuthQuery).toHaveBeenCalledWith(mockKpiHostDetailsOptions);
    });

    // test('should not build hosts query', () => {
    //   expect(buildHostsQuery).not.toHaveBeenCalled();
    // });

    test('should send msearch request', () => {
      expect(mockCallWithRequest).toHaveBeenCalled();
    });
  });

  // describe('Happy Path - get Data', () => {
  //   beforeAll(async () => {
  //     mockCallWithRequest.mockResolvedValue(mockKpiHostDetailsResponse);
  //     jest.doMock('../framework', () => ({
  //       callWithRequest: mockCallWithRequest,
  //     }));
  //     EsKpiHosts = new ElasticsearchKpiHostsAdapter(mockFramework);
  //     data = await EsKpiHosts.getKpiHostDetails(
  //       mockKpiHostDetailsRequest as FrameworkRequest,
  //       mockKpiHostDetailsOptions
  //     );
  //   });

  //   afterAll(() => {
  //     mockCallWithRequest.mockReset();
  //   });

  //   test('getKpiHostDetails - response with data', () => {
  //     expect(data).toEqual(mockKpiHostDetailsResult);
  //   });
  // });

  // describe('Unhappy Path - no Data', () => {
  //   beforeAll(async () => {
  //     mockCallWithRequest.mockResolvedValue(mockKpiHostDetailsResponseNoData);
  //     jest.doMock('../framework', () => ({
  //       callWithRequest: mockCallWithRequest,
  //     }));
  //     EsKpiHosts = new ElasticsearchKpiHostsAdapter(mockFramework);
  //     data = await EsKpiHosts.getKpiHostDetails(
  //       mockKpiHostDetailsRequest as FrameworkRequest,
  //       mockKpiHostDetailsOptions
  //     );
  //   });

  //   afterAll(() => {
  //     mockCallWithRequest.mockRestore();
  //   });

  //   test('getKpiHostDetails - response without data', async () => {
  //     expect(data).toEqual({
  //       inspect: {
  //         dsl: [
  //           JSON.stringify(mockKpiHostsAuthQuery[1], null, 2),
  //           JSON.stringify(mockKpiHostsUniqueIpsQuery[1], null, 2),
  //         ],
  //         response: [
  //           JSON.stringify(mockKpiHostDetailsResponseNoData.responses[0]),
  //           JSON.stringify(mockKpiHostDetailsResponseNoData.responses[1]),
  //         ],
  //       },
  //       authSuccess: null,
  //       authSuccessHistogram: null,
  //       authFailure: null,
  //       authFailureHistogram: null,
  //       uniqueSourceIps: null,
  //       uniqueSourceIpsHistogram: null,
  //       uniqueDestinationIps: null,
  //       uniqueDestinationIpsHistogram: null,
  //     });
  //   });
  // });
});
