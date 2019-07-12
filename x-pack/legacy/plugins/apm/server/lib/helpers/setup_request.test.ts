/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { setupRequest } from './setup_request';

function getMockRequest() {
  const callWithRequestSpy = jest.fn();
  const mockRequest = ({
    params: {},
    query: {},
    server: {
      config: () => ({ get: () => 'apm-*' }),
      plugins: {
        elasticsearch: {
          getCluster: () => ({ callWithRequest: callWithRequestSpy })
        }
      }
    },
    getUiSettingsService: () => ({ get: async () => false })
  } as any) as Legacy.Request;

  return { callWithRequestSpy, mockRequest };
}

describe('setupRequest', () => {
  it('should call callWithRequest with default args', async () => {
    const { mockRequest, callWithRequestSpy } = getMockRequest();
    const { client } = setupRequest(mockRequest);
    await client.search({ index: 'apm-*', body: { foo: 'bar' } });
    expect(callWithRequestSpy).toHaveBeenCalledWith(mockRequest, 'search', {
      index: 'apm-*',
      body: {
        foo: 'bar',
        query: {
          bool: {
            filter: [{ range: { 'observer.version_major': { gte: 7 } } }]
          }
        }
      },
      ignore_throttled: true,
      rest_total_hits_as_int: true
    });
  });

  describe('observer.version_major filter', () => {
    describe('if index is apm-*', () => {
      it('should merge `observer.version_major` filter with existing boolean filters', async () => {
        const { mockRequest, callWithRequestSpy } = getMockRequest();
        const { client } = setupRequest(mockRequest);
        await client.search({
          index: 'apm-*',
          body: { query: { bool: { filter: [{ term: 'someTerm' }] } } }
        });
        const params = callWithRequestSpy.mock.calls[0][2];
        expect(params.body).toEqual({
          query: {
            bool: {
              filter: [
                { term: 'someTerm' },
                { range: { 'observer.version_major': { gte: 7 } } }
              ]
            }
          }
        });
      });

      it('should add `observer.version_major` filter if none exists', async () => {
        const { mockRequest, callWithRequestSpy } = getMockRequest();
        const { client } = setupRequest(mockRequest);
        await client.search({ index: 'apm-*' });
        const params = callWithRequestSpy.mock.calls[0][2];
        expect(params.body).toEqual({
          query: {
            bool: {
              filter: [{ range: { 'observer.version_major': { gte: 7 } } }]
            }
          }
        });
      });

      it('should not add `observer.version_major` filter if `includeLegacyData=true`', async () => {
        const { mockRequest, callWithRequestSpy } = getMockRequest();
        const { client } = setupRequest(mockRequest);
        await client.search(
          {
            index: 'apm-*',
            body: { query: { bool: { filter: [{ term: 'someTerm' }] } } }
          },
          {
            includeLegacyData: true
          }
        );
        const params = callWithRequestSpy.mock.calls[0][2];
        expect(params.body).toEqual({
          query: { bool: { filter: [{ term: 'someTerm' }] } }
        });
      });
    });

    it('if index is not an APM index, it should not add `observer.version_major` filter', async () => {
      const { mockRequest, callWithRequestSpy } = getMockRequest();
      const { client } = setupRequest(mockRequest);
      await client.search({
        index: '.ml-*',
        body: {
          query: { bool: { filter: [{ term: 'someTerm' }] } }
        }
      });
      const params = callWithRequestSpy.mock.calls[0][2];
      expect(params.body).toEqual({
        query: {
          bool: {
            filter: [{ term: 'someTerm' }]
          }
        }
      });
    });
  });

  describe('ignore_throttled', () => {
    it('should set `ignore_throttled=true` if `includeFrozen=false`', async () => {
      const { mockRequest, callWithRequestSpy } = getMockRequest();

      // mock includeFrozen to return false
      mockRequest.getUiSettingsService = () => ({ get: async () => false });
      const { client } = setupRequest(mockRequest);
      await client.search({});
      const params = callWithRequestSpy.mock.calls[0][2];
      expect(params.ignore_throttled).toBe(true);
    });

    it('should set `ignore_throttled=false` if `includeFrozen=true`', async () => {
      const { mockRequest, callWithRequestSpy } = getMockRequest();

      // mock includeFrozen to return true
      mockRequest.getUiSettingsService = () => ({ get: async () => true });
      const { client } = setupRequest(mockRequest);
      await client.search({});
      const params = callWithRequestSpy.mock.calls[0][2];
      expect(params.ignore_throttled).toBe(false);
    });
  });
});
