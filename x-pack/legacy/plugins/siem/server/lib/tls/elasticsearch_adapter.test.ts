/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildTlsQuery } from './query_tls.dsl';
import { ElasticsearchTlsAdapter } from './elasticsearch_adapter';
import expect from '@kbn/expect';
import { FrameworkRequest, FrameworkAdapter } from '../framework';
import { mockRequest, mockResponse, mockOptions, expectedTlsEdges, mockTlsQuery } from './mock';
import { TlsData } from '../../graphql/types';

jest.mock('./query_tls.dsl', () => {
  return {
    buildTlsQuery: jest.fn(),
  };
});

describe('elasticsearch_adapter', () => {
  describe('#getTls', () => {
    let data: TlsData;
    const mockCallWithRequest = jest.fn();
    const mockFramework: FrameworkAdapter = {
      version: 'mock',
      callWithRequest: mockCallWithRequest,
      registerGraphQLEndpoint: jest.fn(),
      getIndexPatternsService: jest.fn(),
    };

    beforeAll(async () => {
      (buildTlsQuery as jest.Mock).mockReset();
      (buildTlsQuery as jest.Mock).mockReturnValue(mockTlsQuery);

      mockCallWithRequest.mockResolvedValue(mockResponse);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));

      const EsTls = new ElasticsearchTlsAdapter(mockFramework);
      data = await EsTls.getTls(mockRequest as FrameworkRequest, mockOptions);
    });

    afterAll(() => {
      mockCallWithRequest.mockRestore();
      (buildTlsQuery as jest.Mock).mockClear();
    });

    test('buildTlsQuery', () => {
      expect((buildTlsQuery as jest.Mock).mock.calls[0][0]).to.eql(mockOptions);
    });

    test('will return tlsEdges correctly', () => {
      expect(data.edges).to.eql(expectedTlsEdges);
    });

    test('will return inspect data', () => {
      expect(data.inspect).to.eql({
        dsl: [JSON.stringify(mockTlsQuery, null, 2)],
        response: [JSON.stringify(mockResponse, null, 2)],
      });
    });
  });
});
