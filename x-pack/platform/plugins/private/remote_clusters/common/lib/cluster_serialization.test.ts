/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_MODEL } from '../constants';
import { deserializeCluster, serializeCluster } from './cluster_serialization';

describe('cluster_serialization', () => {
  describe('deserializeCluster()', () => {
    it('should throw an error for invalid arguments', () => {
      // @ts-ignore
      expect(() => deserializeCluster('foo', 'bar')).toThrowError();
    });

    it('should deserialize a complete default cluster object', () => {
      expect(
        deserializeCluster('test_cluster', {
          seeds: ['localhost:9300'],
          connected: true,
          mode: 'sniff',
          num_nodes_connected: 1,
          max_connections_per_cluster: 3,
          initial_connect_timeout: '30s',
          skip_unavailable: false,
          transport: {
            ping_schedule: '-1',
            compress: false,
          },
        })
      ).toEqual({
        name: 'test_cluster',
        mode: 'sniff',
        seeds: ['localhost:9300'],
        isConnected: true,
        connectedNodesCount: 1,
        maxConnectionsPerCluster: 3,
        initialConnectTimeout: '30s',
        skipUnavailable: false,
        transportPingSchedule: '-1',
        transportCompress: false,
        securityModel: SECURITY_MODEL.CERTIFICATE,
      });
    });

    it('should deserialize a complete "proxy" mode cluster object', () => {
      expect(
        deserializeCluster('test_cluster', {
          proxy_address: 'localhost:9300',
          mode: 'proxy',
          connected: true,
          num_proxy_sockets_connected: 1,
          max_proxy_socket_connections: 3,
          initial_connect_timeout: '30s',
          skip_unavailable: false,
          server_name: 'my_server_name',
          transport: {
            ping_schedule: '-1',
            compress: false,
          },
        })
      ).toEqual({
        name: 'test_cluster',
        mode: 'proxy',
        proxyAddress: 'localhost:9300',
        isConnected: true,
        connectedSocketsCount: 1,
        proxySocketConnections: 3,
        initialConnectTimeout: '30s',
        skipUnavailable: false,
        transportPingSchedule: '-1',
        transportCompress: false,
        serverName: 'my_server_name',
        securityModel: SECURITY_MODEL.CERTIFICATE,
      });
    });

    it('should deserialize a cluster object without transport information', () => {
      expect(
        deserializeCluster('test_cluster', {
          seeds: ['localhost:9300'],
          connected: true,
          num_nodes_connected: 1,
          max_connections_per_cluster: 3,
          initial_connect_timeout: '30s',
          skip_unavailable: false,
        })
      ).toEqual({
        name: 'test_cluster',
        seeds: ['localhost:9300'],
        isConnected: true,
        connectedNodesCount: 1,
        maxConnectionsPerCluster: 3,
        initialConnectTimeout: '30s',
        skipUnavailable: false,
        securityModel: SECURITY_MODEL.CERTIFICATE,
      });
    });

    it('should deserialize a cluster that contains a deprecated proxy address', () => {
      expect(
        deserializeCluster(
          'test_cluster',
          {
            seeds: ['localhost:9300'],
            connected: true,
            num_nodes_connected: 1,
            max_connections_per_cluster: 3,
            initial_connect_timeout: '30s',
            skip_unavailable: false,
            transport: {
              ping_schedule: '-1',
              compress: false,
            },
          },
          'localhost:9300'
        )
      ).toEqual({
        name: 'test_cluster',
        proxyAddress: 'localhost:9300',
        mode: 'proxy',
        hasDeprecatedProxySetting: true,
        isConnected: true,
        connectedNodesCount: 1,
        maxConnectionsPerCluster: 3,
        initialConnectTimeout: '30s',
        skipUnavailable: false,
        transportPingSchedule: '-1',
        transportCompress: false,
        securityModel: SECURITY_MODEL.CERTIFICATE,
      });
    });

    it('should deserialize a cluster that contains a deprecated proxy address and is in cloud', () => {
      expect(
        deserializeCluster(
          'test_cluster',
          {
            seeds: ['localhost:9300'],
            connected: true,
            num_nodes_connected: 1,
            max_connections_per_cluster: 3,
            initial_connect_timeout: '30s',
            skip_unavailable: false,
            transport: {
              ping_schedule: '-1',
              compress: false,
            },
          },
          'localhost:9300',
          true
        )
      ).toEqual({
        name: 'test_cluster',
        proxyAddress: 'localhost:9300',
        mode: 'proxy',
        hasDeprecatedProxySetting: true,
        isConnected: true,
        connectedNodesCount: 1,
        maxConnectionsPerCluster: 3,
        initialConnectTimeout: '30s',
        skipUnavailable: false,
        transportPingSchedule: '-1',
        transportCompress: false,
        serverName: 'localhost',
        securityModel: SECURITY_MODEL.CERTIFICATE,
      });
    });

    it('should deserialize a cluster object with arbitrary missing properties', () => {
      expect(
        deserializeCluster('test_cluster', {
          seeds: ['localhost:9300'],
          connected: true,
          num_nodes_connected: 1,
          initial_connect_timeout: '30s',
          transport: {
            compress: false,
          },
        })
      ).toEqual({
        name: 'test_cluster',
        seeds: ['localhost:9300'],
        isConnected: true,
        connectedNodesCount: 1,
        initialConnectTimeout: '30s',
        transportCompress: false,
        securityModel: SECURITY_MODEL.CERTIFICATE,
      });
    });

    it('should deserialize a cluster object with API key based security model', () => {
      expect(
        deserializeCluster('test_cluster', {
          seeds: ['localhost:9300'],
          connected: true,
          mode: 'sniff',
          num_nodes_connected: 1,
          max_connections_per_cluster: 3,
          initial_connect_timeout: '30s',
          skip_unavailable: false,
          transport: {
            ping_schedule: '-1',
            compress: false,
          },
          cluster_credentials: '::es_redacted::',
        })
      ).toEqual({
        name: 'test_cluster',
        mode: 'sniff',
        seeds: ['localhost:9300'],
        isConnected: true,
        connectedNodesCount: 1,
        maxConnectionsPerCluster: 3,
        initialConnectTimeout: '30s',
        skipUnavailable: false,
        transportPingSchedule: '-1',
        transportCompress: false,
        securityModel: SECURITY_MODEL.API,
      });
    });
  });

  describe('serializeCluster()', () => {
    it('should throw an error for invalid arguments', () => {
      // @ts-ignore
      expect(() => serializeCluster('foo')).toThrowError();
    });

    it('should serialize a cluster that has a deprecated proxy setting', () => {
      expect(
        serializeCluster({
          name: 'test_cluster',
          proxyAddress: 'localhost:9300',
          mode: 'proxy',
          isConnected: true,
          skipUnavailable: false,
          proxySocketConnections: 18,
          serverName: 'localhost',
          hasDeprecatedProxySetting: true,
        })
      ).toEqual({
        persistent: {
          cluster: {
            remote: {
              test_cluster: {
                mode: 'proxy',
                proxy_socket_connections: 18,
                proxy_address: 'localhost:9300',
                skip_unavailable: false,
                server_name: 'localhost',
                proxy: null,
              },
            },
          },
        },
      });
    });

    it('should serialize a complete cluster object to only dynamic properties', () => {
      expect(
        serializeCluster({
          name: 'test_cluster',
          seeds: ['localhost:9300'],
          isConnected: true,
          connectedNodesCount: 1,
          maxConnectionsPerCluster: 3,
          initialConnectTimeout: '30s',
          skipUnavailable: false,
          transportPingSchedule: '-1',
          transportCompress: false,
          mode: 'sniff',
        })
      ).toEqual({
        persistent: {
          cluster: {
            remote: {
              test_cluster: {
                mode: 'sniff',
                node_connections: null,
                seeds: ['localhost:9300'],
                skip_unavailable: false,
              },
            },
          },
        },
      });
    });

    it('should serialize a cluster object with missing properties', () => {
      expect(
        serializeCluster({
          name: 'test_cluster',
          seeds: ['localhost:9300'],
        })
      ).toEqual({
        persistent: {
          cluster: {
            remote: {
              test_cluster: {
                mode: null,
                node_connections: null,
                seeds: ['localhost:9300'],
                skip_unavailable: null,
              },
            },
          },
        },
      });
    });

    it('should serialize a cluster object that will be deleted', () => {
      expect(
        serializeCluster(
          {
            name: 'test_cluster',
            seeds: ['localhost:9300'],
          },
          undefined,
          true
        )
      ).toEqual({
        persistent: {
          cluster: {
            remote: {
              test_cluster: {
                mode: null,
                node_connections: null,
                seeds: ['localhost:9300'],
                skip_unavailable: null,
                proxy_address: null,
                proxy_socket_connections: null,
                server_name: null,
              },
            },
          },
        },
      });
    });

    it('should serialize a cluster object that has modified mode', () => {
      expect(
        serializeCluster(
          {
            name: 'test_cluster',
            seeds: ['localhost:9300'],
            isConnected: true,
            connectedNodesCount: 1,
            maxConnectionsPerCluster: 3,
            mode: 'sniff',
            nodeConnections: 18,
          },
          'proxy'
        )
      ).toEqual({
        persistent: {
          cluster: {
            remote: {
              test_cluster: {
                mode: 'sniff',
                node_connections: 18,
                seeds: ['localhost:9300'],
                skip_unavailable: null,
                proxy_address: null,
                proxy_socket_connections: null,
                server_name: null,
              },
            },
          },
        },
      });
    });
  });
});
