import type { SendGetOptions } from './http';
import type { ClusterPayload } from '../../../common/lib';
export declare function loadClusters(options?: SendGetOptions): Promise<import("./http").RemoteCluster[]>;
export declare function addCluster(cluster: ClusterPayload): Promise<import("./http").AddClusterResponse>;
export declare function editCluster(cluster: ClusterPayload): Promise<import("./http").RemoteCluster>;
export declare function removeClusterRequest(name: string): Promise<import("./http").DeleteClustersResponse>;
