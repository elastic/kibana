import type { HttpSetup } from '@kbn/core/public';
import type { Cluster, ClusterPayload } from '../../../common/lib';
export interface SendGetOptions {
    asSystemRequest?: boolean;
}
/**
 * Response from the delete clusters endpoint
 */
export interface DeleteClustersResponse {
    itemsDeleted: string[];
    errors: Array<{
        name: string;
        error: {
            payload: {
                message: string;
            };
        };
    }>;
}
/**
 * Remote cluster with additional UI-specific properties
 */
export type RemoteCluster = Cluster & {
    isConfiguredByNode?: boolean;
};
export interface AddClusterResponse {
    acknowledged: boolean;
}
export declare function init(httpClient: HttpSetup): void;
export declare function getFullPath(path?: string): string;
export declare function sendPost(path: string, payload: ClusterPayload): Promise<AddClusterResponse>;
export declare function sendGet(path?: string, { asSystemRequest }?: SendGetOptions): Promise<RemoteCluster[]>;
export declare function sendPut(path: string, payload: Omit<ClusterPayload, 'name'>): Promise<RemoteCluster>;
export declare function sendDelete(path: string): Promise<DeleteClustersResponse>;
