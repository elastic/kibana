import type { PreloadedState } from 'redux-v4';
import type { RemoteClustersState } from './types';
export declare function createRemoteClustersStore(initialState?: PreloadedState<RemoteClustersState>): import("redux-v4").Store<import("redux-v4").EmptyObject & {
    clusters: import("./types").ClustersState;
    detailPanel: import("./types").DetailPanelState;
    addCluster: import("./types").AddClusterState;
    removeCluster: import("./types").RemoveClusterState;
    editCluster: import("./types").EditClusterState;
}, import("./types").RemoteClustersAction> & {
    dispatch: unknown;
};
export declare const remoteClustersStore: import("redux-v4").Store<import("redux-v4").EmptyObject & {
    clusters: import("./types").ClustersState;
    detailPanel: import("./types").DetailPanelState;
    addCluster: import("./types").AddClusterState;
    removeCluster: import("./types").RemoveClusterState;
    editCluster: import("./types").EditClusterState;
}, import("./types").RemoteClustersAction> & {
    dispatch: unknown;
};
