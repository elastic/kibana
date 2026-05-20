import type { FormFields } from '../remote_cluster_form';
type ClusterError = JSX.Element | null;
export interface ClusterErrors {
    name?: ClusterError;
    seeds?: ClusterError;
    proxyAddress?: ClusterError;
    cloudRemoteAddress?: ClusterError;
    nodeConnections?: ClusterError;
}
export declare const validateCluster: (fields: FormFields, isCloudEnabled: boolean) => ClusterErrors;
export {};
