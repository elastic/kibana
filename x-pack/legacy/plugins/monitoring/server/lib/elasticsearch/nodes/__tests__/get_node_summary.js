/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { handleResponse } from '../get_node_summary';

describe('Elasticsearch Node Summary get_node_summary handleResponse', () => {
  it('should return undefined fields in result for empty response', () => {
    const clusterState = {};
    const shardStats = {};
    const resolver = null;

    const handleFn = handleResponse(clusterState, shardStats, resolver);
    const response = {};

    const result = handleFn(response);
    expect(result).to.be.eql({
      attributes: {},
      resolver: null,
      name: null,
      nodeTypeLabel: 'Offline Node',
      node_ids: [],
      status: 'Offline',
      isOnline: false,
      transport_address: '',
      type: 'node',
    });
  });

  describe('With node_stats hits', () => {
    it('should handle incomplete shardStats data', () => {
      const clusterState = {
        nodes: {
          fooNode: {},
        },
      };
      const shardStats = {
        nodes: {
          fooNode: {},
        },
      };
      const resolver = 'fooNode';

      const handleFn = handleResponse(clusterState, shardStats, resolver);
      const response = {};

      const result = handleFn(response);
      expect(result).to.be.eql({
        attributes: {},
        resolver: 'fooNode',
        name: 'fooNode',
        transport_address: '',
        type: 'node',
        totalShards: undefined,
        indexCount: undefined,
        documents: undefined,
        dataSize: undefined,
        freeSpace: undefined,
        totalSpace: undefined,
        usedHeap: undefined,
        nodeTypeLabel: 'Node',
        nodeTypeClass: 'fa-server',
        node_ids: [],
        status: 'Online',
        isOnline: true,
      });
    });

    it('should handle incomplete shardStats data, master node', () => {
      const clusterState = {
        nodes: {
          'fooNode-Uuid': {},
        },
        master_node: 'fooNode-Uuid',
      };
      const shardStats = {
        nodes: {
          'fooNode-Uuid': {
            shardCount: 22,
            indexCount: 11,
          },
        },
      };
      const resolver = 'fooNode-Uuid';

      const handleFn = handleResponse(clusterState, shardStats, resolver);
      const response = {
        hits: {
          hits: [
            {
              _source: {
                source_node: {
                  attributes: {},
                  uuid: 'fooNode-Uuid',
                  name: 'fooNode-Name',
                  transport_address: '127.0.0.1:9300',
                },
                node_stats: {
                  indices: {
                    docs: {
                      count: 11000,
                    },
                    store: {
                      size_in_bytes: 35000,
                    },
                  },
                  fs: {
                    total: {
                      available_in_bytes: 8700,
                      total_in_bytes: 10000,
                    },
                  },
                  jvm: {
                    mem: {
                      heap_used_percent: 33,
                    },
                  },
                },
              },
            },
          ],
        },
      };

      const result = handleFn(response);
      expect(result).to.be.eql({
        attributes: {},
        resolver: 'fooNode-Uuid',
        name: 'fooNode-Name',
        transport_address: '127.0.0.1:9300',
        type: 'master',
        totalShards: 22,
        indexCount: 11,
        documents: 11000,
        dataSize: 35000,
        freeSpace: 8700,
        totalSpace: 10000,
        usedHeap: 33,
        nodeTypeLabel: 'Master Node',
        nodeTypeClass: 'fa-star',
        node_ids: ['fooNode-Uuid'],
        status: 'Online',
        isOnline: true,
      });
    });
  });
});
