import type { ClusterPayload } from '../../../../common/lib';
import type { AppDispatch } from '../types';
export declare const addCluster: (cluster: ClusterPayload) => (dispatch: AppDispatch) => Promise<{
    type: "ADD_CLUSTER_FAILURE";
    payload: {
        error: {
            message: string;
        };
    };
} | undefined>;
export declare const clearAddClusterErrors: () => (dispatch: AppDispatch) => void;
