import type { PreloadedState } from 'redux';
import type { RemoteClustersState } from './types';
export declare function createRemoteClustersStore(initialState?: PreloadedState<RemoteClustersState>): import("redux").Store<import("redux").EmptyObject & {
    clusters: import("./types").ClustersState;
    detailPanel: import("./types").DetailPanelState;
    addCluster: import("./types").AddClusterState;
    removeCluster: import("./types").RemoveClusterState;
    editCluster: import("./types").EditClusterState;
}, import("./types").RemoteClustersAction> & {
    dispatch: unknown;
};
export declare const remoteClustersStore: import("redux").Store<import("redux").EmptyObject & {
    clusters: import("./types").ClustersState;
    detailPanel: import("./types").DetailPanelState;
    addCluster: import("./types").AddClusterState;
    removeCluster: import("./types").RemoveClusterState;
    editCluster: import("./types").EditClusterState;
}, import("./types").RemoteClustersAction> & {
    dispatch: unknown;
};
