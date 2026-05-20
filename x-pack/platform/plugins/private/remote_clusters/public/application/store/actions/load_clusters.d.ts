import type { AppDispatch } from '../types';
export declare const loadClusters: () => (dispatch: AppDispatch) => Promise<{
    type: "LOAD_CLUSTERS_FAILURE";
    payload: {
        error: any;
    };
} | undefined>;
