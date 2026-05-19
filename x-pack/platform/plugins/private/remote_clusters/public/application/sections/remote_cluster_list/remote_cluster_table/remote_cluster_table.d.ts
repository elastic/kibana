import React, { Component } from 'react';
import type { EuiSearchBarOnChangeArgs } from '@elastic/eui';
import type { RemoteCluster } from '../../../store/types';
export interface Props {
    clusters: RemoteCluster[];
    openDetailPanel: (clusterName: string) => void;
}
interface State {
    prevClusters: RemoteCluster[];
    selectedItems: RemoteCluster[];
    filteredClusters: RemoteCluster[];
    queryText: string;
}
export declare class RemoteClusterTable extends Component<Props, State> {
    static defaultProps: {
        clusters: never[];
    };
    static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null;
    constructor(props: Props);
    onSearch: ({ query, queryText }: EuiSearchBarOnChangeArgs) => void;
    render(): React.JSX.Element;
}
export {};
