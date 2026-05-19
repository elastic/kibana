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
    skip_unavailable?: boolean | string;
    transport?: {
        ping_schedule?: string;
        compress?: boolean;
    };
    proxy_address?: string;
    max_proxy_socket_connections?: number;
    num_proxy_sockets_connected?: number;
    server_name?: string;
    cluster_credentials?: string;
    node_connections?: number | string | undefined;
    proxy_socket_connections?: number | string | undefined;
}
export interface Cluster {
    name: string;
    seeds?: string[];
    skipUnavailable?: boolean;
    nodeConnections?: number | null;
    proxyAddress?: string;
    proxySocketConnections?: number | null;
    serverName?: string;
    mode?: 'proxy' | 'sniff';
    isConnected?: boolean;
    transportPingSchedule?: string;
    transportCompress?: boolean;
    connectedNodesCount?: number;
    maxConnectionsPerCluster?: string | number;
    maxProxySocketConnections?: string | number;
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
export interface ClusterSettingsPayloadEs {
    persistent: {
        cluster: {
            remote: {
                [key: string]: ClusterPayloadEs;
            };
        };
    };
}
export declare function deserializeCluster(name: string, esClusterObject: ClusterInfoEs, deprecatedProxyAddress?: string | undefined, isCloudEnabled?: boolean | undefined, nodeConnectionsSettings?: number | undefined, proxySocketConnectionsSettings?: number | undefined): Cluster;
export declare function serializeCluster(deserializedClusterObject: ClusterPayload, previousClusterMode?: 'proxy' | 'sniff', isDelete?: boolean): ClusterSettingsPayloadEs;
