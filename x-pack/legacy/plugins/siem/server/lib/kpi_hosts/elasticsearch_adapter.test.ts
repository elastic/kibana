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
  mockKpiHostDetailsMsearchOptions,
  mockKpiHostsOptions,
  mockKpiHostDetailsOptions,
  mockKpiHostsRequest,
  mockKpiHostDetailsRequest,
  mockKpiHostsResponse,
  mockKpiHostDetailsResponse,
  mockKpiHostsResult,
  mockKpiHostDetailsResult,
} from './mock';
import * as authQueryDsl from './query_authentication.dsl';
import * as uniqueIpsQueryDsl from './query_unique_ips.dsl';
import * as hostsQueryDsl from './query_hosts.dsl';
import { KpiHostsData, KpiHostDetailsData } from '../../graphql/types';

describe('Hosts Kpi elasticsearch_adapter', () => {
  const mockCallWithRequest = jest.fn();
  const mockFramework: FrameworkAdapter = {
    version: 'mock',
    callWithRequest: mockCallWithRequest,
    exposeStaticDir: jest.fn(),
    registerGraphQLEndpoint: jest.fn(),
    getIndexPatternsService: jest.fn(),
    getSavedObjectsService: jest.fn(),
  };
  let mockBuildUniqueIpsQuery: jest.SpyInstance;
  let mockBuildAuthQuery: jest.SpyInstance;
  let mockBuildHostsQuery: jest.SpyInstance;
  let EsKpiHosts: ElasticsearchKpiHostsAdapter;

  describe('getKpiHosts', () => {
    let data: KpiHostsData;

    describe('getKpiHosts - call stack', () => {
      beforeAll(async () => {
        mockCallWithRequest.mockResolvedValue(mockKpiHostsResponse);
        jest.doMock('../framework', () => ({
          callWithRequest: mockCallWithRequest,
        }));
        mockBuildUniqueIpsQuery = jest
          .spyOn(uniqueIpsQueryDsl, 'buildUniqueIpsQuery')
          .mockReturnValue(mockKpiHostsUniqueIpsQuery);
        mockBuildAuthQuery = jest
          .spyOn(authQueryDsl, 'buildAuthQuery')
          .mockReturnValue(mockKpiHostsAuthQuery);
        mockBuildHostsQuery = jest
          .spyOn(hostsQueryDsl, 'buildHostsQuery')
          .mockReturnValue(mockHostsQuery);

        EsKpiHosts = new ElasticsearchKpiHostsAdapter(mockFramework);
        data = await EsKpiHosts.getKpiHosts(
          mockKpiHostsRequest as FrameworkRequest,
          mockKpiHostsOptions
        );
      });

      afterAll(() => {
        mockCallWithRequest.mockRestore();
        mockBuildUniqueIpsQuery.mockRestore();
        mockBuildAuthQuery.mockRestore();
        mockBuildHostsQuery.mockRestore();
      });

      test('should build general query with correct option', () => {
        expect(mockBuildUniqueIpsQuery).toHaveBeenCalledWith(mockKpiHostsOptions);
      });

      test('should build auth query with correct option', () => {
        expect(mockBuildAuthQuery).toHaveBeenCalledWith(mockKpiHostsOptions);
      });

      test('should build hosts query with correct option', () => {
        expect(mockBuildHostsQuery).toHaveBeenCalledWith(mockKpiHostsOptions);
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
      beforeAll(async () => {
        mockCallWithRequest.mockResolvedValue(null);
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

    describe('getKpiHostDetails - call stack', () => {
      beforeAll(async () => {
        mockCallWithRequest.mockResolvedValue(mockKpiHostDetailsResponse);
        jest.doMock('../framework', () => ({
          callWithRequest: mockCallWithRequest,
        }));
        mockBuildUniqueIpsQuery = jest
          .spyOn(uniqueIpsQueryDsl, 'buildUniqueIpsQuery')
          .mockReturnValue(mockKpiHostDetailsUniqueIpsQuery);
        mockBuildAuthQuery = jest
          .spyOn(authQueryDsl, 'buildAuthQuery')
          .mockReturnValue(mockKpiHostDetailsAuthQuery);
        mockBuildHostsQuery = jest
          .spyOn(hostsQueryDsl, 'buildHostsQuery')
          .mockReturnValue(mockHostsQuery);

        EsKpiHosts = new ElasticsearchKpiHostsAdapter(mockFramework);
        data = await EsKpiHosts.getKpiHostDetails(
          mockKpiHostDetailsRequest as FrameworkRequest,
          mockKpiHostDetailsOptions
        );
      });

      afterAll(() => {
        mockCallWithRequest.mockRestore();
        mockBuildUniqueIpsQuery.mockRestore();
        mockBuildAuthQuery.mockRestore();
        mockBuildHostsQuery.mockRestore();
      });

      test('should build general query with correct option', () => {
        expect(mockBuildUniqueIpsQuery).toHaveBeenCalledWith(mockKpiHostDetailsOptions);
      });

      test('should build auth query with correct option', () => {
        expect(mockBuildAuthQuery).toHaveBeenCalledWith(mockKpiHostDetailsOptions);
      });

      test('should not build hosts query', () => {
        expect(mockBuildHostsQuery).not.toHaveBeenCalled();
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

    describe('Unhappy Path - No data', () => {
      beforeAll(async () => {
        mockCallWithRequest.mockResolvedValue(null);
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

      test('getKpiHostDetails - response without data', async () => {
        expect(data).toEqual({
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
});
