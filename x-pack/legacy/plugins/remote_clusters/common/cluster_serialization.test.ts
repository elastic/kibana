/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deserializeCluster, serializeCluster } from './cluster_serialization';

describe('cluster_serialization', () => {
  describe('deserializeCluster()', () => {
    it('should throw an error for invalid arguments', () => {
      expect(() => deserializeCluster('foo', 'bar')).toThrowError();
    });

    it('should deserialize a complete cluster object', () => {
      expect(
        deserializeCluster('test_cluster', {
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
        })
      ).toEqual({
        name: 'test_cluster',
        seeds: ['localhost:9300'],
        isConnected: true,
        connectedNodesCount: 1,
        maxConnectionsPerCluster: 3,
        initialConnectTimeout: '30s',
        skipUnavailable: false,
        transportPingSchedule: '-1',
        transportCompress: false,
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
      });
    });
  });

  describe('serializeCluster()', () => {
    it('should throw an error for invalid arguments', () => {
      expect(() => serializeCluster('foo')).toThrowError();
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
        })
      ).toEqual({
        persistent: {
          cluster: {
            remote: {
              test_cluster: {
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
                seeds: ['localhost:9300'],
                skip_unavailable: null,
              },
            },
          },
        },
      });
    });
  });
});
