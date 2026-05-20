import type { Cluster, ClusterPayload } from '../../../../common/lib';
import type { RequestError } from '../../../types';
interface Props {
    isLoading: boolean;
    cluster: Cluster | undefined;
    startEditingCluster: (clusterName: string) => void;
    stopEditingCluster: () => void;
    editCluster: (cluster: ClusterPayload) => void;
    isEditingCluster: boolean;
    getEditClusterError?: RequestError;
    clearEditClusterErrors: () => void;
    openDetailPanel: (clusterName: string) => void;
}
export declare const RemoteClusterEdit: React.FC<Props>;
export {};
