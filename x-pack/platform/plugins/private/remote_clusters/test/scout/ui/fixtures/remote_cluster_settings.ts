/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';

// Remote clusters are cluster-global persistent settings. Addresses point at unreachable local
// hosts on purpose — ES accepts them without a live remote, all the UI here needs.

export const seedSniffCluster = (esClient: EsClient, name: string) =>
  esClient.cluster.putSettings({
    persistent: { cluster: { remote: { [name]: { mode: 'sniff', seeds: ['127.0.0.1:9301'] } } } },
  });

export const seedProxyCluster = (esClient: EsClient, name: string) =>
  esClient.cluster.putSettings({
    persistent: {
      cluster: {
        remote: {
          [name]: { mode: 'proxy', proxy_address: '127.0.0.1:9302', server_name: 'test_server' },
        },
      },
    },
  });

// Nulling every field removes the remote; safe to call for a cluster that was
// never registered (ES treats it as a no-op).
export const removeCluster = (esClient: EsClient, name: string) =>
  esClient.cluster.putSettings({
    persistent: {
      cluster: {
        remote: {
          [name]: {
            mode: null,
            seeds: null,
            proxy_address: null,
            proxy_socket_connections: null,
            server_name: null,
            node_connections: null,
            skip_unavailable: null,
          },
        },
      },
    },
  });
