/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PROXY_MODE, SECURITY_MODEL } from '../constants';

// Values returned from ES GET /_remote/info
/**
 * TODO: This interface needs to be updated with values from {@link RemoteInfo} provided
 * by the @elastic/elasticsearch client
 */
export interface ClusterInfoEs {
  seeds?: string[];
  mode?: 'proxy' | 'sniff';
  connected?: boolean;
  num_nodes_connected?: number;
  max_connections_per_cluster?: string | number;
  initial_connect_timeout: string | number;
  skip_unavailable?: boolean;
  transport?: {
    ping_schedule?: string;
    compress?: boolean;
  };
  proxy_address?: string;
  max_proxy_socket_connections?: number;
  num_proxy_sockets_connected?: number;
  server_name?: string;
  cluster_credentials?: string;
}

export interface Cluster {
  name: string;
  seeds?: string[];
  skipUnavailable?: boolean;
  nodeConnections?: number;
  proxyAddress?: string;
  proxySocketConnections?: number;
  serverName?: string;
  mode?: 'proxy' | 'sniff';
  isConnected?: boolean;
  transportPingSchedule?: string;
  transportCompress?: boolean;
  connectedNodesCount?: number;
  maxConnectionsPerCluster?: string | number;
  initialConnectTimeout?: string | number;
  connectedSocketsCount?: number;
  hasDeprecatedProxySetting?: boolean;
  securityModel: 'certificate' | 'api_key';
}

export type ClusterPayload = Omit<Cluster, 'securityModel'>;

export interface ClusterPayloadEs {
  skip_unavailable?: boolean | null;
  mode?: 'sniff' | 'proxy' | null;
  proxy_address?: string | null;
  proxy_socket_connections?: number | null;
  server_name?: string | null;
  seeds?: string[] | null;
  node_connections?: number | null;
  proxy?: null;
}
// Payload expected from ES PUT /_cluster/settings
export interface ClusterSettingsPayloadEs {
  persistent: {
    cluster: {
      remote: {
        [key: string]: ClusterPayloadEs;
      };
    };
  };
}

export function deserializeCluster(
  name: string,
  esClusterObject: ClusterInfoEs,
  deprecatedProxyAddress?: string | undefined,
  isCloudEnabled?: boolean | undefined
): Cluster {
  if (!name || !esClusterObject || typeof esClusterObject !== 'object') {
    throw new Error('Unable to deserialize cluster');
  }

  const {
    seeds,
    mode,
    connected: isConnected,
    num_nodes_connected: connectedNodesCount,
    max_connections_per_cluster: maxConnectionsPerCluster,
    initial_connect_timeout: initialConnectTimeout,
    skip_unavailable: skipUnavailable,
    transport,
    proxy_address: proxyAddress,
    max_proxy_socket_connections: proxySocketConnections,
    num_proxy_sockets_connected: connectedSocketsCount,
    server_name: serverName,
    cluster_credentials: clusterCredentials,
  } = esClusterObject;

  let deserializedClusterObject: Cluster = {
    name,
    mode,
    isConnected,
    connectedNodesCount,
    maxConnectionsPerCluster,
    initialConnectTimeout,
    skipUnavailable,
    seeds,
    proxyAddress,
    proxySocketConnections,
    connectedSocketsCount,
    serverName,
    securityModel: clusterCredentials ? SECURITY_MODEL.API : SECURITY_MODEL.CERTIFICATE,
  };

  if (transport) {
    const { ping_schedule: transportPingSchedule, compress: transportCompress } = transport;

    deserializedClusterObject = {
      ...deserializedClusterObject,
      transportPingSchedule,
      transportCompress,
    };
  }

  // If a user has a remote cluster with the deprecated proxy setting,
  // we transform the data to support the new implementation and also flag the deprecation
  if (deprecatedProxyAddress) {
    // Cloud-specific logic: Create default server name, since field doesn't exist in deprecated implementation
    const defaultServerName = deprecatedProxyAddress.split(':')[0];

    deserializedClusterObject = {
      ...deserializedClusterObject,
      proxyAddress: deprecatedProxyAddress,
      seeds: undefined,
      hasDeprecatedProxySetting: true,
      mode: PROXY_MODE,
      serverName: isCloudEnabled ? defaultServerName : undefined,
    };
  }

  // It's unnecessary to send undefined values back to the client, so we can remove them.
  Object.keys(deserializedClusterObject).forEach((key) => {
    if (deserializedClusterObject[key as keyof Cluster] === undefined) {
      delete deserializedClusterObject[key as keyof Cluster];
    }
  });

  return deserializedClusterObject;
}

export function serializeCluster(
  deserializedClusterObject: ClusterPayload,
  previousClusterMode?: 'proxy' | 'sniff',
  isDelete?: boolean
): ClusterSettingsPayloadEs {
  if (!deserializedClusterObject || typeof deserializedClusterObject !== 'object') {
    throw new Error('Unable to serialize cluster');
  }

  const {
    name,
    seeds,
    skipUnavailable,
    mode,
    nodeConnections,
    proxyAddress,
    proxySocketConnections,
    serverName,
    hasDeprecatedProxySetting,
  } = deserializedClusterObject;

  const clusterData: ClusterPayloadEs = {
    skip_unavailable: typeof skipUnavailable === 'boolean' ? skipUnavailable : null,
    mode: mode || null,
    ...(mode === PROXY_MODE
      ? {
          proxy_address: proxyAddress || null,
          proxy_socket_connections: proxySocketConnections || null,
          server_name: serverName || null,
        }
      : {
          seeds: seeds || null,
          node_connections: nodeConnections || null,
        }),
  };

  // If the cluster is been deleted, we need to set all values to null
  // If the cluster is been edited and the mode has changed, we need to set to null the previous mode settings values
  if (isDelete || (previousClusterMode && previousClusterMode !== mode)) {
    clusterData.proxy_address = proxyAddress || null;
    clusterData.proxy_socket_connections = proxySocketConnections || null;
    clusterData.server_name = serverName || null;
    clusterData.seeds = seeds || null;
    clusterData.node_connections = nodeConnections || null;
  }

  // This is only applicable in edit mode
  // In order to "upgrade" an existing remote cluster to use the new proxy mode settings, we need to set the old proxy setting to null
  if (hasDeprecatedProxySetting) {
    clusterData.proxy = null;
  }

  return {
    // Background on why we only save as persistent settings detailed here: https://github.com/elastic/kibana/pull/26067#issuecomment-441848124
    persistent: {
      cluster: {
        remote: {
          [name]: clusterData,
        },
      },
    },
  };
}
