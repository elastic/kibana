/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from '@kbn/core/server';

import { kibanaResponseFactory } from '@kbn/core/server';

import { licensingMock } from '@kbn/licensing-plugin/server/mocks';

import { httpServerMock, httpServiceMock, coreMock } from '@kbn/core/server/mocks';

import { API_BASE_PATH } from '../../../common/constants';

import { handleEsError } from '../../shared_imports';

import { register } from './add_route';

import { ScopedClusterClientMock } from './types';

// Re-implement the mock that was imported directly from `x-pack/mocks`
function createCoreRequestHandlerContextMock() {
  return {
    core: coreMock.createRequestHandlerContext(),
    licensing: licensingMock.createRequestHandlerContext(),
  };
}

const xpackMocks = {
  createRequestHandlerContext: createCoreRequestHandlerContextMock,
};

describe('ADD remote clusters', () => {
  let handler: RequestHandler;
  let mockRouteDependencies: ReturnType<typeof createMockRouteDependencies>;
  let mockContext: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
  let scopedClusterClientMock: ScopedClusterClientMock;
  let remoteInfoMockFn: ScopedClusterClientMock['asCurrentUser']['cluster']['remoteInfo'];
  let putSettingsMockFn: ScopedClusterClientMock['asCurrentUser']['cluster']['putSettings'];

  const createMockRouteDependencies = () => ({
    router: httpServiceMock.createRouter(),
    getLicenseStatus: () => ({ valid: true }),
    lib: {
      handleEsError,
    },
    config: {
      isCloudEnabled: false,
    },
  });

  const createMockRequest = (
    body: Record<string, any> = {
      name: 'test',
      seeds: ['127.0.0.1:9300'],
      mode: 'sniff',
      skipUnavailable: false,
    }
  ) =>
    httpServerMock.createKibanaRequest({
      method: 'post',
      path: API_BASE_PATH,
      body,
      headers: { authorization: 'foo' },
    });

  beforeEach(() => {
    mockContext = xpackMocks.createRequestHandlerContext();
    scopedClusterClientMock = mockContext.core.elasticsearch.client;
    remoteInfoMockFn = scopedClusterClientMock.asCurrentUser.cluster.remoteInfo;
    putSettingsMockFn = scopedClusterClientMock.asCurrentUser.cluster.putSettings;
    mockRouteDependencies = createMockRouteDependencies();

    register(mockRouteDependencies);
    const [[, handlerFn]] = mockRouteDependencies.router.post.mock.calls;
    handler = handlerFn;
  });

  describe('success', () => {
    test(`adds remote cluster with "sniff" mode`, async () => {
      remoteInfoMockFn.mockResponseOnce({});
      putSettingsMockFn.mockResponseOnce({
        acknowledged: true,
        persistent: {
          cluster: {
            remote: {
              test: {
                connected: true,
                mode: 'sniff',
                seeds: ['127.0.0.1:9300'],
                num_nodes_connected: 1,
                max_connections_per_cluster: 3,
                initial_connect_timeout: '30s',
                skip_unavailable: false,
              },
            },
          },
        },
        transient: {},
      });

      const mockRequest = createMockRequest();

      const response = await handler(
        coreMock.createCustomRequestHandlerContext(mockContext),
        mockRequest,
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ acknowledged: true });

      expect(remoteInfoMockFn).toHaveBeenCalledWith();
      expect(putSettingsMockFn).toHaveBeenCalledWith({
        body: {
          persistent: {
            cluster: {
              remote: {
                test: {
                  seeds: ['127.0.0.1:9300'],
                  skip_unavailable: false,
                  mode: 'sniff',
                  node_connections: null,
                },
              },
            },
          },
        },
      });
    });

    test(`adds remote cluster with "proxy" mode`, async () => {
      remoteInfoMockFn.mockResponseOnce({});
      putSettingsMockFn.mockResponseOnce({
        acknowledged: true,
        persistent: {
          cluster: {
            remote: {
              test: {
                connected: true,
                mode: 'sniff',
                seeds: ['127.0.0.1:9300'],
                num_nodes_connected: 1,
                max_connections_per_cluster: 3,
                initial_connect_timeout: '30s',
                skip_unavailable: false,
              },
            },
          },
        },
        transient: {},
      });

      const mockRequest = createMockRequest({
        name: 'test',
        proxyAddress: '127.0.0.1:9300',
        mode: 'proxy',
        skipUnavailable: false,
        serverName: 'foobar',
      });

      const response = await handler(
        coreMock.createCustomRequestHandlerContext(mockContext),
        mockRequest,
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ acknowledged: true });

      expect(remoteInfoMockFn).toHaveBeenCalledWith();
      expect(putSettingsMockFn).toHaveBeenCalledWith({
        body: {
          persistent: {
            cluster: {
              remote: {
                test: {
                  skip_unavailable: false,
                  mode: 'proxy',
                  proxy_address: '127.0.0.1:9300',
                  proxy_socket_connections: null,
                  server_name: 'foobar',
                },
              },
            },
          },
        },
      });
    });
  });

  describe('failure', () => {
    test('returns 409 if remote cluster already exists', async () => {
      remoteInfoMockFn.mockResponseOnce({
        test: {
          connected: true,
          mode: 'sniff',
          seeds: ['127.0.0.1:9300'],
          num_nodes_connected: 1,
          max_connections_per_cluster: 3,
          initial_connect_timeout: '30s',
          skip_unavailable: false,
        },
      });

      const mockRequest = createMockRequest();

      const response = await handler(
        coreMock.createCustomRequestHandlerContext(mockContext),
        mockRequest,
        kibanaResponseFactory
      );

      expect(response.status).toBe(409);
      expect(response.payload).toEqual({
        message: 'There is already a remote cluster with that name.',
      });

      expect(remoteInfoMockFn).toHaveBeenCalledWith();
      expect(putSettingsMockFn).not.toHaveBeenCalled();
    });

    test('returns 400 ES did not acknowledge remote cluster', async () => {
      remoteInfoMockFn.mockResponseOnce({});
      putSettingsMockFn.mockResponseOnce({} as any);

      const mockRequest = createMockRequest();

      const response = await handler(
        coreMock.createCustomRequestHandlerContext(mockContext),
        mockRequest,
        kibanaResponseFactory
      );

      expect(response.status).toBe(400);
      expect(response.payload).toEqual({
        message: 'Unable to add cluster, no response returned from ES.',
      });

      expect(remoteInfoMockFn).toHaveBeenCalledWith();
      expect(putSettingsMockFn).toHaveBeenCalledWith({
        body: {
          persistent: {
            cluster: {
              remote: {
                test: {
                  seeds: ['127.0.0.1:9300'],
                  skip_unavailable: false,
                  mode: 'sniff',
                  node_connections: null,
                },
              },
            },
          },
        },
      });
    });
  });
});
