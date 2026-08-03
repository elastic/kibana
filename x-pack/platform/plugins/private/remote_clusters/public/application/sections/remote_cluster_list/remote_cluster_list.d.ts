import React, { Component } from 'react';
import type { ScopedHistory } from '@kbn/core/public';
import type { RemoteCluster } from '../../store/types';
export interface Props {
    loadClusters: () => void;
    refreshClusters: () => void;
    openDetailPanel: (clusterName: string) => void;
    closeDetailPanel: () => void;
    isDetailPanelOpen: boolean;
    clusters: RemoteCluster[];
    isLoading: boolean;
    isCopyingCluster: boolean;
    isRemovingCluster: boolean;
    clusterLoadError: unknown;
    history: ScopedHistory;
}
export declare class RemoteClusterList extends Component<Props> {
    interval?: ReturnType<typeof setInterval>;
    componentDidUpdate(): void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    renderBlockingAction(): React.JSX.Element | null;
    renderNoPermission(): React.JSX.Element;
    renderError(error: unknown): React.JSX.Element;
    renderEmpty(): React.JSX.Element;
    renderLoading(): React.JSX.Element;
    renderList(): React.JSX.Element;
    render(): React.JSX.Element;
}
