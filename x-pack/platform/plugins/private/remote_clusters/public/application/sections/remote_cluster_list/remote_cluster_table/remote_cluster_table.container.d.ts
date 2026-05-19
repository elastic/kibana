import { RemoteClusterTable as RemoteClusterTableComponent } from './remote_cluster_table';
export declare const RemoteClusterTable: import("react-redux").ConnectedComponent<typeof RemoteClusterTableComponent, import("react-redux").Omit<Pick<import("react").ClassAttributes<RemoteClusterTableComponent> & import("./remote_cluster_table").Props, "openDetailPanel" | keyof import("react").ClassAttributes<RemoteClusterTableComponent>> & {
    clusters?: import("../../../services/http").RemoteCluster[] | undefined;
} & {}, "openDetailPanel">>;
