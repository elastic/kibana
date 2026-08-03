import type { ClusterPayload } from '../../../../common/lib';
import type { AppDispatch } from '../types';
export declare const editCluster: (cluster: ClusterPayload) => (dispatch: AppDispatch) => Promise<{
    type: "EDIT_CLUSTER_FAILURE";
    payload: {
        error: {
            message: string;
        };
    };
} | undefined>;
export declare const startEditingCluster: ({ clusterName }: {
    clusterName: string;
}) => (dispatch: AppDispatch) => void;
export declare const stopEditingCluster: () => (dispatch: AppDispatch) => void;
export declare const clearEditClusterErrors: () => (dispatch: AppDispatch) => void;
